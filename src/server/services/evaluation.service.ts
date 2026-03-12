import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import {
  EvaluationServiceError,
  type EvaluationSessionCreateInput,
  type EvaluationSessionUpdateInput,
  type EvaluationSessionListInput,
  type EvaluationAssignEvaluatorsInput,
  type EvaluationRemoveEvaluatorInput,
  type EvaluationAddIdeasInput,
  type EvaluationRemoveIdeaInput,
  type EvaluationAddIdeasFromBucketInput,
  type EvaluationSubmitResponseInput,
  type EvaluationProgressInput,
  type EvaluationResultsInput,
  type EvaluationSaveAsTemplateInput,
  type EvaluationListTemplatesInput,
} from "./evaluation.schemas";
export { EvaluationServiceError } from "./evaluation.schemas";

const childLogger = logger.child({ service: "evaluation" });

// ── List Sessions ────────────────────────────────────────────

export async function listEvaluationSessions(input: EvaluationSessionListInput) {
  const where: Prisma.EvaluationSessionWhereInput = {
    campaignId: input.campaignId,
  };

  if (input.status) where.status = input.status;
  if (input.type) where.type = input.type;
  if (input.isTemplate !== undefined) where.isTemplate = input.isTemplate;

  const items = await prisma.evaluationSession.findMany({
    where,
    include: {
      _count: {
        select: {
          criteria: true,
          evaluators: true,
          ideas: true,
          responses: true,
        },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((s) => ({
      id: s.id,
      campaignId: s.campaignId,
      title: s.title,
      description: s.description,
      type: s.type,
      status: s.status,
      dueDate: s.dueDate?.toISOString() ?? null,
      isTemplate: s.isTemplate,
      criteriaCount: s._count.criteria,
      evaluatorCount: s._count.evaluators,
      ideaCount: s._count.ideas,
      responseCount: s._count.responses,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

// ── Get Session By ID ────────────────────────────────────────

export async function getEvaluationSessionById(id: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    include: {
      criteria: { orderBy: { sortOrder: "asc" } },
      evaluators: { select: { id: true, userId: true, assignedAt: true } },
      ideas: {
        select: {
          id: true,
          ideaId: true,
          sortOrder: true,
          idea: { select: { id: true, title: true, teaser: true, status: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  return {
    id: session.id,
    campaignId: session.campaignId,
    title: session.title,
    description: session.description,
    type: session.type,
    status: session.status,
    dueDate: session.dueDate?.toISOString() ?? null,
    isTemplate: session.isTemplate,
    templateId: session.templateId,
    createdById: session.createdById,
    criteria: session.criteria.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      guidanceText: c.guidanceText,
      fieldType: c.fieldType,
      weight: c.weight,
      sortOrder: c.sortOrder,
      isRequired: c.isRequired,
      scaleMin: c.scaleMin,
      scaleMax: c.scaleMax,
      scaleLabels: c.scaleLabels as Record<string, string> | null,
      visibleWhen: c.visibleWhen as { criterionId: string; value: string } | null,
    })),
    evaluators: session.evaluators.map((e) => ({
      id: e.id,
      userId: e.userId,
      assignedAt: e.assignedAt.toISOString(),
    })),
    ideas: session.ideas.map((i) => ({
      id: i.id,
      ideaId: i.ideaId,
      sortOrder: i.sortOrder,
      idea: {
        id: i.idea.id,
        title: i.idea.title,
        teaser: i.idea.teaser,
        status: i.idea.status,
      },
    })),
    responseCount: session._count.responses,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── Create Session ───────────────────────────────────────────

export async function createEvaluationSession(
  input: EvaluationSessionCreateInput,
  createdById: string,
) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new EvaluationServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  for (const criterion of input.criteria) {
    if (criterion.fieldType === "SELECTION_SCALE") {
      if (criterion.scaleMin === undefined || criterion.scaleMax === undefined) {
        throw new EvaluationServiceError(
          `Criterion "${criterion.title}" requires scaleMin and scaleMax for SELECTION_SCALE type`,
          "INVALID_SCALE_CONFIG",
        );
      }
      if (criterion.scaleMin >= criterion.scaleMax) {
        throw new EvaluationServiceError(
          `Criterion "${criterion.title}" scaleMin must be less than scaleMax`,
          "INVALID_SCALE_RANGE",
        );
      }
    }
  }

  const session = await prisma.evaluationSession.create({
    data: {
      campaignId: input.campaignId,
      title: input.title,
      description: input.description,
      type: input.type,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      isTemplate: input.isTemplate,
      templateId: input.templateId,
      createdById,
      criteria: {
        create: input.criteria.map((c, index) => ({
          title: c.title,
          description: c.description,
          guidanceText: c.guidanceText,
          fieldType: c.fieldType,
          weight: c.weight,
          sortOrder: c.sortOrder ?? index,
          isRequired: c.isRequired,
          scaleMin: c.scaleMin,
          scaleMax: c.scaleMax,
          scaleLabels: c.scaleLabels as Prisma.InputJsonValue | undefined,
          visibleWhen: c.visibleWhen as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: {
      criteria: { orderBy: { sortOrder: "asc" } },
      _count: { select: { evaluators: true, ideas: true, responses: true } },
    },
  });

  eventBus.emit("evaluation.sessionCreated", {
    entity: "evaluationSession",
    entityId: session.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: input.campaignId,
      type: session.type,
      title: session.title,
    },
  });

  childLogger.info(
    { sessionId: session.id, campaignId: input.campaignId, type: session.type },
    "Evaluation session created",
  );

  return {
    id: session.id,
    campaignId: session.campaignId,
    title: session.title,
    description: session.description,
    type: session.type,
    status: session.status,
    dueDate: session.dueDate?.toISOString() ?? null,
    isTemplate: session.isTemplate,
    criteriaCount: session.criteria.length,
    evaluatorCount: session._count.evaluators,
    ideaCount: session._count.ideas,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── Update Session ───────────────────────────────────────────

export async function updateEvaluationSession(
  input: EvaluationSessionUpdateInput,
  updatedById: string,
) {
  const existing = await prisma.evaluationSession.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, campaignId: true },
  });

  if (!existing) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (existing.status !== "DRAFT") {
    throw new EvaluationServiceError("Only draft sessions can be updated", "SESSION_NOT_DRAFT");
  }

  const data: Prisma.EvaluationSessionUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }

  if (input.criteria) {
    await prisma.evaluationCriterion.deleteMany({
      where: { sessionId: input.id },
    });

    await prisma.evaluationCriterion.createMany({
      data: input.criteria.map((c, index) => ({
        sessionId: input.id,
        title: c.title,
        description: c.description,
        guidanceText: c.guidanceText,
        fieldType: c.fieldType,
        weight: c.weight,
        sortOrder: c.sortOrder ?? index,
        isRequired: c.isRequired,
        scaleMin: c.scaleMin,
        scaleMax: c.scaleMax,
        scaleLabels: c.scaleLabels as Prisma.InputJsonValue | undefined,
        visibleWhen: c.visibleWhen as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  const session = await prisma.evaluationSession.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { criteria: true, evaluators: true, ideas: true, responses: true } },
    },
  });

  eventBus.emit("evaluation.sessionUpdated", {
    entity: "evaluationSession",
    entityId: session.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: existing.campaignId },
  });

  childLogger.info({ sessionId: session.id }, "Evaluation session updated");

  return {
    id: session.id,
    campaignId: session.campaignId,
    title: session.title,
    description: session.description,
    type: session.type,
    status: session.status,
    dueDate: session.dueDate?.toISOString() ?? null,
    isTemplate: session.isTemplate,
    criteriaCount: session._count.criteria,
    evaluatorCount: session._count.evaluators,
    ideaCount: session._count.ideas,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── Delete Session ───────────────────────────────────────────

export async function deleteEvaluationSession(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    select: { id: true, status: true, campaignId: true, title: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status === "ACTIVE") {
    throw new EvaluationServiceError(
      "Cannot delete an active session. Complete or archive it first.",
      "SESSION_ACTIVE",
    );
  }

  await prisma.evaluationSession.delete({ where: { id } });

  eventBus.emit("evaluation.sessionUpdated", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, action: "deleted" },
  });

  childLogger.info({ sessionId: id, campaignId: session.campaignId }, "Evaluation session deleted");

  return { success: true };
}

// ── Activate Session ─────────────────────────────────────────

export async function activateEvaluationSession(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    include: {
      _count: { select: { criteria: true, evaluators: true, ideas: true } },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status !== "DRAFT") {
    throw new EvaluationServiceError("Only draft sessions can be activated", "SESSION_NOT_DRAFT");
  }

  if (session._count.criteria === 0) {
    throw new EvaluationServiceError("Session must have at least one criterion", "NO_CRITERIA");
  }

  if (session._count.evaluators === 0) {
    throw new EvaluationServiceError("Session must have at least one evaluator", "NO_EVALUATORS");
  }

  if (session._count.ideas === 0) {
    throw new EvaluationServiceError("Session must have at least one idea", "NO_IDEAS");
  }

  const updated = await prisma.evaluationSession.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  eventBus.emit("evaluation.sessionActivated", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId },
  });

  childLogger.info({ sessionId: id }, "Evaluation session activated");

  return {
    id: updated.id,
    status: updated.status,
  };
}

// ── Complete Session ─────────────────────────────────────────

export async function completeEvaluationSession(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    select: { id: true, status: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status !== "ACTIVE") {
    throw new EvaluationServiceError("Only active sessions can be completed", "SESSION_NOT_ACTIVE");
  }

  const updated = await prisma.evaluationSession.update({
    where: { id },
    data: { status: "COMPLETED" },
  });

  eventBus.emit("evaluation.sessionCompleted", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId },
  });

  childLogger.info({ sessionId: id }, "Evaluation session completed");

  return {
    id: updated.id,
    status: updated.status,
  };
}

// ── Assign Evaluators ────────────────────────────────────────

export async function assignEvaluators(input: EvaluationAssignEvaluatorsInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status === "COMPLETED" || session.status === "ARCHIVED") {
    throw new EvaluationServiceError(
      "Cannot assign evaluators to a completed or archived session",
      "SESSION_CLOSED",
    );
  }

  const existingEvaluators = await prisma.evaluationSessionEvaluator.findMany({
    where: { sessionId: input.sessionId },
    select: { userId: true },
  });

  const existingUserIds = new Set(existingEvaluators.map((e) => e.userId));
  const newUserIds = input.userIds.filter((uid) => !existingUserIds.has(uid));

  if (newUserIds.length === 0) {
    return { added: 0 };
  }

  await prisma.evaluationSessionEvaluator.createMany({
    data: newUserIds.map((userId) => ({
      sessionId: input.sessionId,
      userId,
      assignedBy: actor,
    })),
  });

  eventBus.emit("evaluation.evaluatorAssigned", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, userIds: newUserIds },
  });

  childLogger.info({ sessionId: input.sessionId, count: newUserIds.length }, "Evaluators assigned");

  return { added: newUserIds.length };
}

// ── Remove Evaluator ─────────────────────────────────────────

export async function removeEvaluator(input: EvaluationRemoveEvaluatorInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status === "COMPLETED" || session.status === "ARCHIVED") {
    throw new EvaluationServiceError(
      "Cannot remove evaluators from a completed or archived session",
      "SESSION_CLOSED",
    );
  }

  const evaluator = await prisma.evaluationSessionEvaluator.findUnique({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: input.userId,
      },
    },
  });

  if (!evaluator) {
    throw new EvaluationServiceError("Evaluator not found in this session", "EVALUATOR_NOT_FOUND");
  }

  await prisma.$transaction([
    prisma.evaluationResponse.deleteMany({
      where: { sessionId: input.sessionId, evaluatorId: input.userId },
    }),
    prisma.evaluationSessionEvaluator.delete({
      where: { id: evaluator.id },
    }),
  ]);

  eventBus.emit("evaluation.evaluatorRemoved", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, userId: input.userId },
  });

  childLogger.info({ sessionId: input.sessionId, userId: input.userId }, "Evaluator removed");

  return { success: true };
}

// ── Add Ideas ────────────────────────────────────────────────

export async function addIdeasToSession(input: EvaluationAddIdeasInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status === "COMPLETED" || session.status === "ARCHIVED") {
    throw new EvaluationServiceError(
      "Cannot add ideas to a completed or archived session",
      "SESSION_CLOSED",
    );
  }

  const ideas = await prisma.idea.findMany({
    where: { id: { in: input.ideaIds }, campaignId: session.campaignId },
    select: { id: true },
  });

  const validIdeaIds = new Set(ideas.map((i) => i.id));
  const invalidIds = input.ideaIds.filter((id) => !validIdeaIds.has(id));

  if (invalidIds.length > 0) {
    throw new EvaluationServiceError(
      `Some ideas not found or not in this campaign: ${invalidIds.join(", ")}`,
      "IDEAS_NOT_FOUND",
    );
  }

  const existingIdeas = await prisma.evaluationSessionIdea.findMany({
    where: { sessionId: input.sessionId },
    select: { ideaId: true, sortOrder: true },
    orderBy: { sortOrder: "desc" },
  });

  const existingIdeaIds = new Set(existingIdeas.map((i) => i.ideaId));
  const newIdeaIds = input.ideaIds.filter((id) => !existingIdeaIds.has(id));

  if (newIdeaIds.length === 0) {
    return { added: 0 };
  }

  const maxSortOrder = existingIdeas[0]?.sortOrder ?? -1;

  await prisma.evaluationSessionIdea.createMany({
    data: newIdeaIds.map((ideaId, index) => ({
      sessionId: input.sessionId,
      ideaId,
      sortOrder: maxSortOrder + 1 + index,
    })),
  });

  eventBus.emit("evaluation.ideaAdded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, ideaIds: newIdeaIds },
  });

  childLogger.info(
    { sessionId: input.sessionId, count: newIdeaIds.length },
    "Ideas added to evaluation session",
  );

  return { added: newIdeaIds.length };
}

// ── Add Ideas from Bucket ────────────────────────────────────

export async function addIdeasFromBucket(input: EvaluationAddIdeasFromBucketInput, actor: string) {
  const bucket = await prisma.bucket.findUnique({
    where: { id: input.bucketId },
    select: { id: true, campaignId: true },
  });

  if (!bucket) {
    throw new EvaluationServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  const assignments = await prisma.ideaBucketAssignment.findMany({
    where: { bucketId: input.bucketId },
    select: { ideaId: true },
  });

  const ideaIds = assignments.map((a) => a.ideaId);

  if (ideaIds.length === 0) {
    return { added: 0 };
  }

  return addIdeasToSession({ sessionId: input.sessionId, ideaIds }, actor);
}

// ── Remove Idea ──────────────────────────────────────────────

export async function removeIdeaFromSession(input: EvaluationRemoveIdeaInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status === "COMPLETED" || session.status === "ARCHIVED") {
    throw new EvaluationServiceError(
      "Cannot remove ideas from a completed or archived session",
      "SESSION_CLOSED",
    );
  }

  const sessionIdea = await prisma.evaluationSessionIdea.findUnique({
    where: {
      sessionId_ideaId: {
        sessionId: input.sessionId,
        ideaId: input.ideaId,
      },
    },
  });

  if (!sessionIdea) {
    throw new EvaluationServiceError("Idea not found in this session", "IDEA_NOT_IN_SESSION");
  }

  await prisma.$transaction([
    prisma.evaluationResponse.deleteMany({
      where: { sessionId: input.sessionId, ideaId: input.ideaId },
    }),
    prisma.evaluationSessionIdea.delete({
      where: { id: sessionIdea.id },
    }),
  ]);

  eventBus.emit("evaluation.ideaRemoved", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, ideaId: input.ideaId },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId },
    "Idea removed from evaluation session",
  );

  return { success: true };
}

// ── Submit Response ──────────────────────────────────────────

export async function submitResponse(input: EvaluationSubmitResponseInput, evaluatorId: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.status !== "ACTIVE") {
    throw new EvaluationServiceError(
      "Responses can only be submitted to active sessions",
      "SESSION_NOT_ACTIVE",
    );
  }

  const evaluator = await prisma.evaluationSessionEvaluator.findUnique({
    where: {
      sessionId_userId: {
        sessionId: input.sessionId,
        userId: evaluatorId,
      },
    },
  });

  if (!evaluator) {
    throw new EvaluationServiceError("You are not an evaluator for this session", "NOT_EVALUATOR");
  }

  const sessionIdea = await prisma.evaluationSessionIdea.findUnique({
    where: {
      sessionId_ideaId: {
        sessionId: input.sessionId,
        ideaId: input.ideaId,
      },
    },
  });

  if (!sessionIdea) {
    throw new EvaluationServiceError("Idea not found in this session", "IDEA_NOT_IN_SESSION");
  }

  const upserts = input.responses.map((r) =>
    prisma.evaluationResponse.upsert({
      where: {
        sessionId_criterionId_evaluatorId_ideaId: {
          sessionId: input.sessionId,
          criterionId: r.criterionId,
          evaluatorId,
          ideaId: input.ideaId,
        },
      },
      create: {
        sessionId: input.sessionId,
        criterionId: r.criterionId,
        evaluatorId,
        ideaId: input.ideaId,
        scoreValue: r.scoreValue,
        textValue: r.textValue,
        boolValue: r.boolValue,
      },
      update: {
        scoreValue: r.scoreValue,
        textValue: r.textValue,
        boolValue: r.boolValue,
      },
    }),
  );

  await prisma.$transaction(upserts);

  eventBus.emit("evaluation.responseSubmitted", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor: evaluatorId,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: session.campaignId,
      ideaId: input.ideaId,
      responseCount: input.responses.length,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, evaluatorId, ideaId: input.ideaId },
    "Evaluation response submitted",
  );

  return { saved: input.responses.length };
}

// ── Get Progress ─────────────────────────────────────────────

export async function getEvaluationProgress(input: EvaluationProgressInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    include: {
      evaluators: { select: { userId: true } },
      ideas: { select: { ideaId: true } },
      criteria: { select: { id: true } },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  const totalExpected = session.evaluators.length * session.ideas.length * session.criteria.length;

  const responses = await prisma.evaluationResponse.groupBy({
    by: ["evaluatorId"],
    where: { sessionId: input.sessionId },
    _count: { id: true },
  });

  const responseMap = new Map(responses.map((r) => [r.evaluatorId, r._count.id]));
  const expectedPerEvaluator = session.ideas.length * session.criteria.length;

  const evaluatorProgress = session.evaluators.map((e) => {
    const completed = responseMap.get(e.userId) ?? 0;
    return {
      userId: e.userId,
      completed,
      total: expectedPerEvaluator,
      percentage:
        expectedPerEvaluator > 0 ? Math.round((completed / expectedPerEvaluator) * 100) : 0,
    };
  });

  const totalCompleted = evaluatorProgress.reduce((sum, ep) => sum + ep.completed, 0);

  return {
    sessionId: input.sessionId,
    status: session.status,
    evaluatorProgress,
    overall: {
      completed: totalCompleted,
      total: totalExpected,
      percentage: totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0,
    },
  };
}

// ── Get Results ──────────────────────────────────────────────

export async function getEvaluationResults(input: EvaluationResultsInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    include: {
      criteria: { orderBy: { sortOrder: "asc" } },
      ideas: {
        include: {
          idea: { select: { id: true, title: true, teaser: true, status: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  const responses = await prisma.evaluationResponse.findMany({
    where: { sessionId: input.sessionId },
  });

  const scoreCriteria = session.criteria.filter((c) => c.fieldType === "SELECTION_SCALE");
  const totalWeight = scoreCriteria.reduce((sum, c) => sum + c.weight, 0);

  const ideaResults = session.ideas.map((sessionIdea) => {
    const ideaResponses = responses.filter((r) => r.ideaId === sessionIdea.ideaId);

    const criteriaScores = scoreCriteria.map((criterion) => {
      const criterionResponses = ideaResponses.filter(
        (r) => r.criterionId === criterion.id && r.scoreValue !== null,
      );
      const scores = criterionResponses.map((r) => r.scoreValue!);

      const count = scores.length;
      const avg = count > 0 ? scores.reduce((a, b) => a + b, 0) / count : 0;
      const stdDev =
        count > 1 ? Math.sqrt(scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / (count - 1)) : 0;

      return {
        criterionId: criterion.id,
        criterionTitle: criterion.title,
        weight: criterion.weight,
        average: Math.round(avg * 100) / 100,
        standardDeviation: Math.round(stdDev * 100) / 100,
        responseCount: count,
        min: count > 0 ? Math.min(...scores) : null,
        max: count > 0 ? Math.max(...scores) : null,
      };
    });

    const weightedScore =
      totalWeight > 0
        ? criteriaScores.reduce((sum, cs) => sum + (cs.average * cs.weight) / totalWeight, 0)
        : 0;

    return {
      ideaId: sessionIdea.ideaId,
      ideaTitle: sessionIdea.idea.title,
      ideaTeaser: sessionIdea.idea.teaser,
      ideaStatus: sessionIdea.idea.status,
      weightedScore: Math.round(weightedScore * 100) / 100,
      criteriaScores,
    };
  });

  ideaResults.sort((a, b) => b.weightedScore - a.weightedScore);

  return {
    sessionId: session.id,
    sessionTitle: session.title,
    type: session.type,
    status: session.status,
    criteria: session.criteria.map((c) => ({
      id: c.id,
      title: c.title,
      fieldType: c.fieldType,
      weight: c.weight,
    })),
    results: ideaResults,
  };
}

// ── Save as Template ─────────────────────────────────────────

export async function saveSessionAsTemplate(input: EvaluationSaveAsTemplateInput, actor: string) {
  const source = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    include: { criteria: { orderBy: { sortOrder: "asc" } } },
  });

  if (!source) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  const template = await prisma.evaluationSession.create({
    data: {
      campaignId: source.campaignId,
      title: input.title,
      description: source.description,
      type: source.type,
      isTemplate: true,
      createdById: actor,
      criteria: {
        create: source.criteria.map((c) => ({
          title: c.title,
          description: c.description,
          guidanceText: c.guidanceText,
          fieldType: c.fieldType,
          weight: c.weight,
          sortOrder: c.sortOrder,
          isRequired: c.isRequired,
          scaleMin: c.scaleMin,
          scaleMax: c.scaleMax,
          scaleLabels: c.scaleLabels as Prisma.InputJsonValue | undefined,
          visibleWhen: c.visibleWhen as Prisma.InputJsonValue | undefined,
        })),
      },
    },
    include: { _count: { select: { criteria: true } } },
  });

  childLogger.info(
    { templateId: template.id, sourceId: input.sessionId },
    "Evaluation session saved as template",
  );

  return {
    id: template.id,
    title: template.title,
    type: template.type,
    isTemplate: template.isTemplate,
    criteriaCount: template._count.criteria,
    createdAt: template.createdAt.toISOString(),
  };
}

// ── List Templates ───────────────────────────────────────────

export async function listTemplates(input: EvaluationListTemplatesInput) {
  const items = await prisma.evaluationSession.findMany({
    where: { isTemplate: true },
    include: {
      _count: { select: { criteria: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      description: t.description,
      criteriaCount: t._count.criteria,
      createdAt: t.createdAt.toISOString(),
    })),
    nextCursor,
  };
}
