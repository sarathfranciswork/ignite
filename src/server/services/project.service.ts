import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  ProjectListInput,
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectAddTeamMemberInput,
  ProjectRemoveTeamMemberInput,
  RequestGateReviewInput,
  SubmitGateDecisionInput,
  GetPhaseInstancesInput,
  UpdatePhaseDatesInput,
} from "./project.schemas";

const childLogger = logger.child({ service: "project" });

export class ProjectServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

const detailInclude = {
  processDefinition: {
    include: {
      phases: {
        orderBy: { position: "asc" as const },
        include: {
          activities: {
            orderBy: { position: "asc" as const },
            include: {
              tasks: {
                orderBy: { position: "asc" as const },
              },
            },
          },
        },
      },
    },
  },
  currentPhase: true,
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  sourceIdea: {
    select: { id: true, title: true },
  },
  teamMembers: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const listInclude = {
  processDefinition: {
    select: { id: true, name: true },
  },
  currentPhase: {
    select: { id: true, name: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  sourceIdea: {
    select: { id: true, title: true },
  },
  _count: {
    select: { teamMembers: true },
  },
} as const;

export async function listProjects(input: ProjectListInput) {
  const where: Prisma.ProjectWhereInput = {};

  if (input.status) {
    where.status = input.status;
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
  const orderBy: Prisma.ProjectOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.project.findMany({
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
      isConfidential: item.isConfidential,
      processDefinition: item.processDefinition,
      currentPhase: item.currentPhase,
      createdBy: item.createdBy,
      sourceIdea: item.sourceIdea,
      teamMemberCount: item._count.teamMembers,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${id} not found`);
  }

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    isConfidential: project.isConfidential,
    processDefinition: {
      id: project.processDefinition.id,
      name: project.processDefinition.name,
      phases: project.processDefinition.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        description: phase.description,
        plannedDurationDays: phase.plannedDurationDays,
        position: phase.position,
        activities: phase.activities.map((activity) => ({
          id: activity.id,
          name: activity.name,
          description: activity.description,
          isMandatory: activity.isMandatory,
          position: activity.position,
          tasks: activity.tasks.map((task) => ({
            id: task.id,
            name: task.name,
            fieldType: task.fieldType,
            isMandatory: task.isMandatory,
            position: task.position,
          })),
        })),
      })),
    },
    currentPhase: project.currentPhase
      ? { id: project.currentPhase.id, name: project.currentPhase.name }
      : null,
    createdBy: project.createdBy,
    sourceIdea: project.sourceIdea,
    teamMembers: project.teamMembers.map((tm) => ({
      id: tm.id,
      role: tm.role,
      user: tm.user,
      createdAt: tm.createdAt.toISOString(),
    })),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export async function createProject(input: ProjectCreateInput, userId: string) {
  const processDefinition = await prisma.processDefinition.findUnique({
    where: { id: input.processDefinitionId },
    include: {
      phases: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!processDefinition) {
    throw new ProjectServiceError(
      "PROCESS_DEFINITION_NOT_FOUND",
      `Process definition ${input.processDefinitionId} not found`,
    );
  }

  if (input.sourceIdeaId) {
    const idea = await prisma.idea.findUnique({
      where: { id: input.sourceIdeaId },
    });
    if (!idea) {
      throw new ProjectServiceError("IDEA_NOT_FOUND", `Idea ${input.sourceIdeaId} not found`);
    }
  }

  const firstPhase = processDefinition.phases[0];

  const project = await prisma.project.create({
    data: {
      title: input.title,
      description: input.description,
      processDefinitionId: input.processDefinitionId,
      currentPhaseId: firstPhase?.id ?? null,
      createdById: userId,
      sourceIdeaId: input.sourceIdeaId,
      teamMembers: {
        create: (input.teamMembers ?? []).map((tm) => ({
          userId: tm.userId,
          role: tm.role,
        })),
      },
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

  eventBus.emit("project.created", {
    entity: "Project",
    entityId: project.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      processDefinitionId: input.processDefinitionId,
      sourceIdeaId: input.sourceIdeaId,
    },
  });

  childLogger.info({ projectId: project.id }, "Project created");

  return getProjectById(project.id);
}

export async function updateProject(input: ProjectUpdateInput, userId: string) {
  const existing = await prisma.project.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.id} not found`);
  }

  const updateData: Prisma.ProjectUpdateInput = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;

  await prisma.project.update({
    where: { id: input.id },
    data: updateData,
  });

  eventBus.emit("project.updated", {
    entity: "Project",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ projectId: input.id }, "Project updated");

  return getProjectById(input.id);
}

export async function deleteProject(id: string, userId: string) {
  const existing = await prisma.project.findUnique({ where: { id } });

  if (!existing) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${id} not found`);
  }

  await prisma.project.delete({ where: { id } });

  eventBus.emit("project.deleted", {
    entity: "Project",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ projectId: id }, "Project deleted");

  return { id };
}

export async function addTeamMember(input: ProjectAddTeamMemberInput, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) {
    throw new ProjectServiceError("USER_NOT_FOUND", `User ${input.userId} not found`);
  }

  const existingMember = await prisma.projectTeamMember.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
  });

  if (existingMember) {
    throw new ProjectServiceError(
      "MEMBER_ALREADY_EXISTS",
      `User ${input.userId} is already a team member`,
    );
  }

  await prisma.projectTeamMember.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
    },
  });

  eventBus.emit("project.teamMemberAdded", {
    entity: "Project",
    entityId: input.projectId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { addedUserId: input.userId, role: input.role },
  });

  childLogger.info({ projectId: input.projectId, addedUserId: input.userId }, "Team member added");

  return getProjectById(input.projectId);
}

export async function removeTeamMember(input: ProjectRemoveTeamMemberInput, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  const existingMember = await prisma.projectTeamMember.findUnique({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
  });

  if (!existingMember) {
    throw new ProjectServiceError(
      "MEMBER_NOT_FOUND",
      `User ${input.userId} is not a team member of this project`,
    );
  }

  await prisma.projectTeamMember.delete({
    where: { projectId_userId: { projectId: input.projectId, userId: input.userId } },
  });

  eventBus.emit("project.teamMemberRemoved", {
    entity: "Project",
    entityId: input.projectId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { removedUserId: input.userId },
  });

  childLogger.info(
    { projectId: input.projectId, removedUserId: input.userId },
    "Team member removed",
  );

  return getProjectById(input.projectId);
}

export async function getPhaseInstances(input: GetPhaseInstancesInput) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  const instances = await prisma.projectPhaseInstance.findMany({
    where: { projectId: input.projectId },
    include: {
      phase: {
        select: { id: true, name: true, description: true, plannedDurationDays: true },
      },
      gateDecisions: {
        include: {
          gatekeeper: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: { position: "asc" },
  });

  return instances.map((inst) => ({
    id: inst.id,
    projectId: inst.projectId,
    phase: inst.phase,
    position: inst.position,
    status: inst.status,
    plannedStartAt: inst.plannedStartAt?.toISOString() ?? null,
    plannedEndAt: inst.plannedEndAt?.toISOString() ?? null,
    actualStartAt: inst.actualStartAt?.toISOString() ?? null,
    actualEndAt: inst.actualEndAt?.toISOString() ?? null,
    reworkFeedback: inst.reworkFeedback,
    postponeUntil: inst.postponeUntil?.toISOString() ?? null,
    gateDecisions: inst.gateDecisions.map((gd) => ({
      id: gd.id,
      gatekeeper: gd.gatekeeper,
      decision: gd.decision,
      feedback: gd.feedback,
      createdAt: gd.createdAt.toISOString(),
    })),
    createdAt: inst.createdAt.toISOString(),
    updatedAt: inst.updatedAt.toISOString(),
  }));
}

export async function requestGateReview(input: RequestGateReviewInput, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: { currentPhase: true },
  });

  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  if (project.status !== "ACTIVE") {
    throw new ProjectServiceError(
      "INVALID_PROJECT_STATUS",
      "Gate review can only be requested for active projects",
    );
  }

  if (!project.currentPhaseId) {
    throw new ProjectServiceError("NO_CURRENT_PHASE", "Project has no active phase");
  }

  const phaseInstance = await prisma.projectPhaseInstance.findUnique({
    where: {
      projectId_phaseId: {
        projectId: input.projectId,
        phaseId: project.currentPhaseId,
      },
    },
  });

  if (!phaseInstance) {
    throw new ProjectServiceError("PHASE_INSTANCE_NOT_FOUND", "Current phase instance not found");
  }

  if (phaseInstance.status !== "ELABORATION") {
    throw new ProjectServiceError(
      "INVALID_PHASE_STATUS",
      `Phase is in ${phaseInstance.status} status, must be ELABORATION to request gate review`,
    );
  }

  await prisma.projectPhaseInstance.update({
    where: { id: phaseInstance.id },
    data: { status: "GATE_REVIEW" },
  });

  eventBus.emit("project.gateReviewRequested", {
    entity: "Project",
    entityId: input.projectId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      phaseInstanceId: phaseInstance.id,
      phaseId: project.currentPhaseId,
    },
  });

  childLogger.info(
    { projectId: input.projectId, phaseInstanceId: phaseInstance.id },
    "Gate review requested",
  );

  return getPhaseInstances({ projectId: input.projectId });
}

export async function submitGateDecision(input: SubmitGateDecisionInput, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: {
      processDefinition: {
        include: {
          phases: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });

  if (!project) {
    throw new ProjectServiceError("PROJECT_NOT_FOUND", `Project ${input.projectId} not found`);
  }

  if (project.status !== "ACTIVE") {
    throw new ProjectServiceError(
      "INVALID_PROJECT_STATUS",
      "Gate decisions can only be submitted for active projects",
    );
  }

  const phaseInstance = await prisma.projectPhaseInstance.findUnique({
    where: { id: input.phaseInstanceId },
  });

  if (!phaseInstance) {
    throw new ProjectServiceError(
      "PHASE_INSTANCE_NOT_FOUND",
      `Phase instance ${input.phaseInstanceId} not found`,
    );
  }

  if (phaseInstance.projectId !== input.projectId) {
    throw new ProjectServiceError(
      "PHASE_INSTANCE_MISMATCH",
      "Phase instance does not belong to this project",
    );
  }

  if (phaseInstance.status !== "GATE_REVIEW") {
    throw new ProjectServiceError(
      "INVALID_PHASE_STATUS",
      `Phase is in ${phaseInstance.status} status, must be GATE_REVIEW to submit a decision`,
    );
  }

  const isGatekeeper = await prisma.projectTeamMember.findFirst({
    where: {
      projectId: input.projectId,
      userId,
      role: "GATEKEEPER",
    },
  });

  if (!isGatekeeper) {
    throw new ProjectServiceError("NOT_A_GATEKEEPER", "Only gatekeepers can submit gate decisions");
  }

  const gateDecision = await prisma.gateDecision.create({
    data: {
      phaseInstanceId: input.phaseInstanceId,
      gatekeeperId: userId,
      decision: input.decision,
      feedback: input.feedback,
    },
  });

  eventBus.emit("project.gateDecision", {
    entity: "Project",
    entityId: input.projectId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      phaseInstanceId: input.phaseInstanceId,
      decision: input.decision,
      gateDecisionId: gateDecision.id,
    },
  });

  switch (input.decision) {
    case "FORWARD":
      await handleForwardDecision(project, phaseInstance, userId);
      break;
    case "REWORK":
      await handleReworkDecision(phaseInstance, input.feedback ?? null);
      break;
    case "POSTPONE":
      await handlePostponeDecision(phaseInstance, input.postponeUntil ?? null);
      break;
    case "TERMINATE":
      await handleTerminateDecision(project, input.feedback ?? null, userId);
      break;
  }

  childLogger.info(
    {
      projectId: input.projectId,
      phaseInstanceId: input.phaseInstanceId,
      decision: input.decision,
    },
    "Gate decision submitted",
  );

  return getPhaseInstances({ projectId: input.projectId });
}

async function handleForwardDecision(
  project: {
    id: string;
    currentPhaseId: string | null;
    processDefinition: {
      phases: Array<{ id: string; position: number }>;
    };
  },
  phaseInstance: { id: string; phaseId: string; position: number },
  userId: string,
) {
  const phases = project.processDefinition.phases;
  const currentIndex = phases.findIndex((p) => p.id === phaseInstance.phaseId);
  const nextPhase = phases[currentIndex + 1];

  await prisma.projectPhaseInstance.update({
    where: { id: phaseInstance.id },
    data: {
      status: "COMPLETED",
      actualEndAt: new Date(),
    },
  });

  if (nextPhase) {
    await prisma.projectPhaseInstance.update({
      where: {
        projectId_phaseId: {
          projectId: project.id,
          phaseId: nextPhase.id,
        },
      },
      data: {
        status: "ELABORATION",
        actualStartAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { currentPhaseId: nextPhase.id },
    });

    eventBus.emit("project.phaseAdvanced", {
      entity: "Project",
      entityId: project.id,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        fromPhaseId: phaseInstance.phaseId,
        toPhaseId: nextPhase.id,
      },
    });
  } else {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "COMPLETED",
        currentPhaseId: null,
      },
    });

    eventBus.emit("project.completed", {
      entity: "Project",
      entityId: project.id,
      actor: userId,
      timestamp: new Date().toISOString(),
    });
  }
}

async function handleReworkDecision(phaseInstance: { id: string }, feedback: string | null) {
  await prisma.projectPhaseInstance.update({
    where: { id: phaseInstance.id },
    data: {
      status: "ELABORATION",
      reworkFeedback: feedback,
    },
  });
}

async function handlePostponeDecision(phaseInstance: { id: string }, postponeUntil: string | null) {
  await prisma.projectPhaseInstance.update({
    where: { id: phaseInstance.id },
    data: {
      status: "ELABORATION",
      postponeUntil: postponeUntil ? new Date(postponeUntil) : null,
    },
  });
}

async function handleTerminateDecision(
  project: { id: string },
  feedback: string | null,
  userId: string,
) {
  await prisma.project.update({
    where: { id: project.id },
    data: { status: "TERMINATED" },
  });

  eventBus.emit("project.terminated", {
    entity: "Project",
    entityId: project.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { reason: feedback },
  });
}

export async function updatePhaseDates(input: UpdatePhaseDatesInput, _userId: string) {
  const phaseInstance = await prisma.projectPhaseInstance.findUnique({
    where: { id: input.phaseInstanceId },
  });

  if (!phaseInstance) {
    throw new ProjectServiceError(
      "PHASE_INSTANCE_NOT_FOUND",
      `Phase instance ${input.phaseInstanceId} not found`,
    );
  }

  const updateData: Prisma.ProjectPhaseInstanceUpdateInput = {};
  if (input.plannedStartAt !== undefined) {
    updateData.plannedStartAt = input.plannedStartAt ? new Date(input.plannedStartAt) : null;
  }
  if (input.plannedEndAt !== undefined) {
    updateData.plannedEndAt = input.plannedEndAt ? new Date(input.plannedEndAt) : null;
  }

  await prisma.projectPhaseInstance.update({
    where: { id: input.phaseInstanceId },
    data: updateData,
  });

  childLogger.info({ phaseInstanceId: input.phaseInstanceId }, "Phase dates updated");

  return getPhaseInstances({ projectId: phaseInstance.projectId });
}
