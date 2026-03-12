import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type { ConceptStatus } from "@prisma/client";
import {
  isValidConceptTransition,
  getConceptTransitionGuards,
  CONCEPT_GUARD_FAILURE_MESSAGES,
} from "@/server/lib/state-machines/concept-transitions";
import type {
  ConceptListInput,
  ConceptCreateInput,
  ConceptUpdateInput,
  ConceptTransitionInput,
  ConceptSubmitDecisionInput,
  ConceptAddTeamMemberInput,
  ConceptRemoveTeamMemberInput,
  ConceptConvertToProjectInput,
} from "./concept.schemas";

const childLogger = logger.child({ service: "concept" });

export class ConceptServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ConceptServiceError";
  }
}

const detailInclude = {
  owner: {
    select: { id: true, name: true, email: true, image: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  sourceIdea: {
    select: { id: true, title: true },
  },
  convertedProject: {
    select: { id: true, title: true, status: true },
  },
  teamMembers: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  decisions: {
    orderBy: { createdAt: "desc" as const },
    take: 10,
  },
} as const;

const listInclude = {
  owner: {
    select: { id: true, name: true, email: true, image: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  sourceIdea: {
    select: { id: true, title: true },
  },
  convertedProject: {
    select: { id: true, title: true },
  },
  _count: {
    select: { teamMembers: true, decisions: true },
  },
} as const;

export async function listConcepts(input: ConceptListInput) {
  const where: Prisma.ConceptWhereInput = {};

  if (input.status) {
    where.status = input.status;
  }

  if (input.ownerId) {
    where.ownerId = input.ownerId;
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "updatedAt";
  const sortDirection = input.sortDirection ?? "desc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.ConceptOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.concept.findMany({
    where,
    include: listInclude,
    orderBy,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      status: item.status,
      owner: item.owner,
      createdBy: item.createdBy,
      sourceIdea: item.sourceIdea,
      convertedProject: item.convertedProject,
      teamMemberCount: item._count.teamMembers,
      decisionCount: item._count.decisions,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getConceptById(id: string) {
  const concept = await prisma.concept.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!concept) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${id} not found`);
  }

  return {
    id: concept.id,
    title: concept.title,
    description: concept.description,
    status: concept.status,
    problemStatement: concept.problemStatement,
    proposedSolution: concept.proposedSolution,
    valueProposition: concept.valueProposition,
    swotStrengths: concept.swotStrengths,
    swotWeaknesses: concept.swotWeaknesses,
    swotOpportunities: concept.swotOpportunities,
    swotThreats: concept.swotThreats,
    targetMarket: concept.targetMarket,
    resourceRequirements: concept.resourceRequirements,
    expectedRoi: concept.expectedRoi,
    riskAssessment: concept.riskAssessment,
    owner: concept.owner,
    createdBy: concept.createdBy,
    sourceIdea: concept.sourceIdea,
    convertedProject: concept.convertedProject,
    teamMembers: concept.teamMembers.map((tm) => ({
      id: tm.id,
      role: tm.role,
      user: tm.user,
      createdAt: tm.createdAt.toISOString(),
    })),
    decisions: concept.decisions.map((d) => ({
      id: d.id,
      decision: d.decision,
      feedback: d.feedback,
      decidedBy: d.decidedBy,
      createdAt: d.createdAt.toISOString(),
    })),
    createdAt: concept.createdAt.toISOString(),
    updatedAt: concept.updatedAt.toISOString(),
  };
}

export async function createConcept(input: ConceptCreateInput, userId: string) {
  if (input.sourceIdeaId) {
    const idea = await prisma.idea.findUnique({
      where: { id: input.sourceIdeaId },
    });
    if (!idea) {
      throw new ConceptServiceError("IDEA_NOT_FOUND", `Idea ${input.sourceIdeaId} not found`);
    }
  }

  const ownerId = input.ownerId ?? userId;

  const concept = await prisma.concept.create({
    data: {
      title: input.title,
      description: input.description,
      sourceIdeaId: input.sourceIdeaId,
      ownerId,
      createdById: userId,
      teamMembers: {
        create: {
          userId: ownerId,
          role: "OWNER",
        },
      },
    },
  });

  eventBus.emit("concept.created", {
    entity: "Concept",
    entityId: concept.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      sourceIdeaId: input.sourceIdeaId,
    },
  });

  childLogger.info({ conceptId: concept.id }, "Concept created");

  return getConceptById(concept.id);
}

export async function updateConcept(input: ConceptUpdateInput, userId: string) {
  const existing = await prisma.concept.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${input.id} not found`);
  }

  if (existing.status === "APPROVED" || existing.status === "REJECTED") {
    throw new ConceptServiceError(
      "CONCEPT_TERMINAL_STATUS",
      "Cannot update a concept that has been approved or rejected",
    );
  }

  const updateData: Prisma.ConceptUpdateInput = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.problemStatement !== undefined) updateData.problemStatement = input.problemStatement;
  if (input.proposedSolution !== undefined) updateData.proposedSolution = input.proposedSolution;
  if (input.valueProposition !== undefined) updateData.valueProposition = input.valueProposition;
  if (input.swotStrengths !== undefined) updateData.swotStrengths = input.swotStrengths;
  if (input.swotWeaknesses !== undefined) updateData.swotWeaknesses = input.swotWeaknesses;
  if (input.swotOpportunities !== undefined) updateData.swotOpportunities = input.swotOpportunities;
  if (input.swotThreats !== undefined) updateData.swotThreats = input.swotThreats;
  if (input.targetMarket !== undefined) updateData.targetMarket = input.targetMarket;
  if (input.resourceRequirements !== undefined)
    updateData.resourceRequirements = input.resourceRequirements;
  if (input.expectedRoi !== undefined) updateData.expectedRoi = input.expectedRoi;
  if (input.riskAssessment !== undefined) updateData.riskAssessment = input.riskAssessment;

  await prisma.concept.update({
    where: { id: input.id },
    data: updateData,
  });

  eventBus.emit("concept.updated", {
    entity: "Concept",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ conceptId: input.id }, "Concept updated");

  return getConceptById(input.id);
}

export async function deleteConcept(id: string, userId: string) {
  const existing = await prisma.concept.findUnique({ where: { id } });

  if (!existing) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${id} not found`);
  }

  await prisma.concept.delete({ where: { id } });

  eventBus.emit("concept.deleted", {
    entity: "Concept",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ conceptId: id }, "Concept deleted");

  return { id };
}

export async function transitionConcept(input: ConceptTransitionInput, userId: string) {
  const concept = await prisma.concept.findUnique({
    where: { id: input.id },
  });

  if (!concept) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${input.id} not found`);
  }

  if (!isValidConceptTransition(concept.status, input.targetStatus as ConceptStatus)) {
    throw new ConceptServiceError(
      "INVALID_TRANSITION",
      `Cannot transition from ${concept.status} to ${input.targetStatus}`,
    );
  }

  const guards = getConceptTransitionGuards(concept.status, input.targetStatus as ConceptStatus);
  for (const guard of guards) {
    if (guard === "HAS_PROBLEM_STATEMENT" && !concept.problemStatement) {
      throw new ConceptServiceError("GUARD_FAILED", CONCEPT_GUARD_FAILURE_MESSAGES[guard]);
    }
    if (guard === "HAS_PROPOSED_SOLUTION" && !concept.proposedSolution) {
      throw new ConceptServiceError("GUARD_FAILED", CONCEPT_GUARD_FAILURE_MESSAGES[guard]);
    }
  }

  await prisma.concept.update({
    where: { id: input.id },
    data: { status: input.targetStatus as ConceptStatus },
  });

  eventBus.emit("concept.statusChanged", {
    entity: "Concept",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      fromStatus: concept.status,
      toStatus: input.targetStatus,
    },
  });

  childLogger.info(
    { conceptId: input.id, from: concept.status, to: input.targetStatus },
    "Concept transitioned",
  );

  return getConceptById(input.id);
}

export async function submitConceptDecision(input: ConceptSubmitDecisionInput, userId: string) {
  const concept = await prisma.concept.findUnique({
    where: { id: input.conceptId },
  });

  if (!concept) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${input.conceptId} not found`);
  }

  if (concept.status !== "EVALUATION") {
    throw new ConceptServiceError(
      "INVALID_STATUS_FOR_DECISION",
      "Decisions can only be submitted when the concept is in Evaluation phase",
    );
  }

  let newStatus: ConceptStatus;
  switch (input.decision) {
    case "APPROVE":
      newStatus = "APPROVED";
      break;
    case "REJECT":
      newStatus = "REJECTED";
      break;
    case "REVISE":
      newStatus = "ELABORATION";
      break;
    default:
      throw new ConceptServiceError("INVALID_DECISION", `Unknown decision: ${input.decision}`);
  }

  await prisma.$transaction([
    prisma.conceptDecision.create({
      data: {
        conceptId: input.conceptId,
        decision: input.decision,
        feedback: input.feedback,
        decidedBy: userId,
      },
    }),
    prisma.concept.update({
      where: { id: input.conceptId },
      data: { status: newStatus },
    }),
  ]);

  const eventName =
    input.decision === "APPROVE"
      ? "concept.approved"
      : input.decision === "REJECT"
        ? "concept.rejected"
        : "concept.statusChanged";

  eventBus.emit(eventName, {
    entity: "Concept",
    entityId: input.conceptId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      decision: input.decision,
      feedback: input.feedback,
      fromStatus: "EVALUATION",
      toStatus: newStatus,
    },
  });

  childLogger.info(
    { conceptId: input.conceptId, decision: input.decision },
    "Concept decision submitted",
  );

  return getConceptById(input.conceptId);
}

export async function addConceptTeamMember(input: ConceptAddTeamMemberInput, userId: string) {
  const concept = await prisma.concept.findUnique({
    where: { id: input.conceptId },
  });

  if (!concept) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${input.conceptId} not found`);
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!user) {
    throw new ConceptServiceError("USER_NOT_FOUND", `User ${input.userId} not found`);
  }

  const existing = await prisma.conceptTeamMember.findUnique({
    where: {
      conceptId_userId: {
        conceptId: input.conceptId,
        userId: input.userId,
      },
    },
  });

  if (existing) {
    throw new ConceptServiceError("MEMBER_ALREADY_EXISTS", "User is already a team member");
  }

  await prisma.conceptTeamMember.create({
    data: {
      conceptId: input.conceptId,
      userId: input.userId,
      role: input.role,
    },
  });

  eventBus.emit("concept.teamMemberAdded", {
    entity: "Concept",
    entityId: input.conceptId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { addedUserId: input.userId, role: input.role },
  });

  childLogger.info(
    { conceptId: input.conceptId, addedUserId: input.userId },
    "Concept team member added",
  );

  return getConceptById(input.conceptId);
}

export async function removeConceptTeamMember(input: ConceptRemoveTeamMemberInput, userId: string) {
  const concept = await prisma.concept.findUnique({
    where: { id: input.conceptId },
  });

  if (!concept) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${input.conceptId} not found`);
  }

  if (concept.ownerId === input.userId) {
    throw new ConceptServiceError(
      "CANNOT_REMOVE_OWNER",
      "Cannot remove the concept owner from the team",
    );
  }

  const member = await prisma.conceptTeamMember.findUnique({
    where: {
      conceptId_userId: {
        conceptId: input.conceptId,
        userId: input.userId,
      },
    },
  });

  if (!member) {
    throw new ConceptServiceError("MEMBER_NOT_FOUND", "User is not a team member");
  }

  await prisma.conceptTeamMember.delete({
    where: { id: member.id },
  });

  eventBus.emit("concept.teamMemberRemoved", {
    entity: "Concept",
    entityId: input.conceptId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { removedUserId: input.userId },
  });

  childLogger.info(
    { conceptId: input.conceptId, removedUserId: input.userId },
    "Concept team member removed",
  );

  return getConceptById(input.conceptId);
}

export async function convertConceptToProject(input: ConceptConvertToProjectInput, userId: string) {
  const concept = await prisma.concept.findUnique({
    where: { id: input.conceptId },
    include: { convertedProject: true, sourceIdea: true },
  });

  if (!concept) {
    throw new ConceptServiceError("CONCEPT_NOT_FOUND", `Concept ${input.conceptId} not found`);
  }

  if (concept.status !== "APPROVED") {
    throw new ConceptServiceError(
      "CONCEPT_NOT_APPROVED",
      "Only approved concepts can be converted to projects",
    );
  }

  if (concept.convertedProject) {
    throw new ConceptServiceError(
      "CONCEPT_ALREADY_CONVERTED",
      "This concept has already been converted to a project",
    );
  }

  const processDefinition = await prisma.processDefinition.findUnique({
    where: { id: input.processDefinitionId },
    include: {
      phases: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!processDefinition) {
    throw new ConceptServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${input.processDefinitionId} not found`,
    );
  }

  const firstPhase = processDefinition.phases[0];

  const project = await prisma.project.create({
    data: {
      title: concept.title,
      description: concept.description,
      processDefinitionId: input.processDefinitionId,
      currentPhaseId: firstPhase?.id ?? null,
      createdById: userId,
      sourceIdeaId: concept.sourceIdeaId,
      sourceConceptId: concept.id,
      phaseInstances: {
        create: processDefinition.phases.map((phase, index) => ({
          phaseId: phase.id,
          position: phase.position,
          status: index === 0 ? "ELABORATION" : "SKIPPED",
          actualStartAt: index === 0 ? new Date() : null,
        })),
      },
    },
  });

  eventBus.emit("concept.convertedToProject", {
    entity: "Concept",
    entityId: input.conceptId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      projectId: project.id,
      processDefinitionId: input.processDefinitionId,
    },
  });

  childLogger.info(
    { conceptId: input.conceptId, projectId: project.id },
    "Concept converted to project",
  );

  return {
    concept: await getConceptById(input.conceptId),
    projectId: project.id,
  };
}
