import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import {
  AdhocEvaluationServiceError,
  type AdhocEvaluationCreateInput,
  type AdhocEvaluationUpdateInput,
  type AdhocEvaluationListInput,
  type AdhocAddItemsInput,
  type OneTeamCreateInput,
  type ConsensusNoteCreateInput,
  type ConsensusNoteListInput,
} from "./adhoc-evaluation.schemas";
export { AdhocEvaluationServiceError } from "./adhoc-evaluation.schemas";

const childLogger = logger.child({ service: "adhoc-evaluation" });

// ── Create Ad-Hoc Evaluation ────────────────────────────────

export async function createAdhocEvaluation(
  input: AdhocEvaluationCreateInput,
  createdById: string,
) {
  for (const criterion of input.criteria) {
    if (criterion.fieldType === "SELECTION_SCALE") {
      if (criterion.scaleMin === undefined || criterion.scaleMax === undefined) {
        throw new AdhocEvaluationServiceError(
          `Criterion "${criterion.title}" requires scaleMin and scaleMax for SELECTION_SCALE type`,
          "INVALID_SCALE_CONFIG",
        );
      }
      if (criterion.scaleMin >= criterion.scaleMax) {
        throw new AdhocEvaluationServiceError(
          `Criterion "${criterion.title}" scaleMin must be less than scaleMax`,
          "INVALID_SCALE_RANGE",
        );
      }
    }
  }

  const session = await prisma.evaluationSession.create({
    data: {
      campaignId: null,
      title: input.title,
      description: input.description,
      type: input.type,
      mode: "AD_HOC",
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
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
        })),
      },
      ...(input.evaluatorIds && input.evaluatorIds.length > 0
        ? {
            evaluators: {
              create: input.evaluatorIds.map((userId) => ({
                userId,
                assignedBy: createdById,
              })),
            },
          }
        : {}),
    },
    include: {
      criteria: { orderBy: { sortOrder: "asc" } },
      _count: { select: { evaluators: true, ideas: true, responses: true } },
    },
  });

  eventBus.emit("adhocEvaluation.created", {
    entity: "evaluationSession",
    entityId: session.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: { type: session.type, mode: "AD_HOC", title: session.title },
  });

  childLogger.info(
    { sessionId: session.id, type: session.type },
    "Ad-hoc evaluation session created",
  );

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    type: session.type,
    mode: session.mode,
    status: session.status,
    dueDate: session.dueDate?.toISOString() ?? null,
    criteriaCount: session.criteria.length,
    evaluatorCount: session._count.evaluators,
    ideaCount: session._count.ideas,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── List Ad-Hoc Evaluations ─────────────────────────────────

export async function listAdhocEvaluations(input: AdhocEvaluationListInput, userId: string) {
  const where: Prisma.EvaluationSessionWhereInput = {
    mode: "AD_HOC",
    isTemplate: false,
    OR: [{ createdById: userId }, { evaluators: { some: { userId } } }],
  };

  if (input.status) where.status = input.status;

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
      title: s.title,
      description: s.description,
      type: s.type,
      mode: s.mode,
      status: s.status,
      dueDate: s.dueDate?.toISOString() ?? null,
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

// ── Get Ad-Hoc Evaluation By ID ─────────────────────────────

export async function getAdhocEvaluationById(id: string) {
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
          adHocTitle: true,
          adHocDescription: true,
          idea: { select: { id: true, title: true, teaser: true, status: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "AD_HOC" && session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError(
      "This is not an ad-hoc or one-team evaluation session",
      "INVALID_MODE",
    );
  }

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    type: session.type,
    mode: session.mode,
    status: session.status,
    dueDate: session.dueDate?.toISOString() ?? null,
    isCollaborative: session.isCollaborative,
    facilitatorId: session.facilitatorId,
    consensusRequired: session.consensusRequired,
    liveSessionStarted: session.liveSessionStarted?.toISOString() ?? null,
    liveSessionEnded: session.liveSessionEnded?.toISOString() ?? null,
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
      adHocTitle: i.adHocTitle,
      adHocDescription: i.adHocDescription,
      idea: i.idea
        ? {
            id: i.idea.id,
            title: i.idea.title,
            teaser: i.idea.teaser,
            status: i.idea.status,
          }
        : null,
    })),
    responseCount: session._count.responses,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── Update Ad-Hoc Evaluation ────────────────────────────────

export async function updateAdhocEvaluation(
  input: AdhocEvaluationUpdateInput,
  updatedById: string,
) {
  const existing = await prisma.evaluationSession.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, mode: true },
  });

  if (!existing) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (existing.mode !== "AD_HOC") {
    throw new AdhocEvaluationServiceError("This is not an ad-hoc evaluation", "INVALID_MODE");
  }

  if (existing.status !== "DRAFT") {
    throw new AdhocEvaluationServiceError(
      "Only draft sessions can be updated",
      "SESSION_NOT_DRAFT",
    );
  }

  const data: Prisma.EvaluationSessionUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }

  if (input.criteria) {
    await prisma.$transaction([
      prisma.evaluationCriterion.deleteMany({
        where: { sessionId: input.id },
      }),
      prisma.evaluationCriterion.createMany({
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
        })),
      }),
    ]);
  }

  const session = await prisma.evaluationSession.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { criteria: true, evaluators: true, ideas: true, responses: true } },
    },
  });

  eventBus.emit("adhocEvaluation.updated", {
    entity: "evaluationSession",
    entityId: session.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { mode: "AD_HOC" },
  });

  childLogger.info({ sessionId: session.id }, "Ad-hoc evaluation session updated");

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    type: session.type,
    mode: session.mode,
    status: session.status,
    dueDate: session.dueDate?.toISOString() ?? null,
    criteriaCount: session._count.criteria,
    evaluatorCount: session._count.evaluators,
    ideaCount: session._count.ideas,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── Delete Ad-Hoc Evaluation ────────────────────────────────

export async function deleteAdhocEvaluation(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    select: { id: true, status: true, mode: true, title: true },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "AD_HOC") {
    throw new AdhocEvaluationServiceError("This is not an ad-hoc evaluation", "INVALID_MODE");
  }

  if (session.status === "ACTIVE") {
    throw new AdhocEvaluationServiceError(
      "Cannot delete an active session. Complete it first.",
      "SESSION_ACTIVE",
    );
  }

  await prisma.evaluationSession.delete({ where: { id } });

  eventBus.emit("adhocEvaluation.deleted", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { title: session.title },
  });

  childLogger.info({ sessionId: id }, "Ad-hoc evaluation session deleted");

  return { success: true };
}

// ── Activate Ad-Hoc Evaluation ──────────────────────────────

export async function activateAdhocEvaluation(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    include: {
      _count: { select: { criteria: true, evaluators: true, ideas: true } },
    },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "AD_HOC" && session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError("This is not an ad-hoc evaluation", "INVALID_MODE");
  }

  if (session.status !== "DRAFT") {
    throw new AdhocEvaluationServiceError(
      "Only draft sessions can be activated",
      "SESSION_NOT_DRAFT",
    );
  }

  if (session._count.criteria === 0) {
    throw new AdhocEvaluationServiceError(
      "Session must have at least one criterion",
      "NO_CRITERIA",
    );
  }

  if (session._count.evaluators === 0) {
    throw new AdhocEvaluationServiceError(
      "Session must have at least one evaluator",
      "NO_EVALUATORS",
    );
  }

  const updated = await prisma.evaluationSession.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  eventBus.emit("adhocEvaluation.activated", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { mode: session.mode },
  });

  childLogger.info({ sessionId: id }, "Ad-hoc evaluation session activated");

  return { id: updated.id, status: updated.status };
}

// ── Complete Ad-Hoc Evaluation ──────────────────────────────

export async function completeAdhocEvaluation(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    select: { id: true, status: true, mode: true },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "AD_HOC" && session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError("This is not an ad-hoc evaluation", "INVALID_MODE");
  }

  if (session.status !== "ACTIVE") {
    throw new AdhocEvaluationServiceError(
      "Only active sessions can be completed",
      "SESSION_NOT_ACTIVE",
    );
  }

  const updated = await prisma.evaluationSession.update({
    where: { id },
    data: { status: "COMPLETED" },
  });

  eventBus.emit("adhocEvaluation.completed", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { mode: session.mode },
  });

  childLogger.info({ sessionId: id }, "Ad-hoc evaluation session completed");

  return { id: updated.id, status: updated.status };
}

// ── Add Items to Ad-Hoc Evaluation ──────────────────────────

export async function addItemsToAdhocEvaluation(input: AdhocAddItemsInput, _actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, mode: true },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "AD_HOC" && session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError("This is not an ad-hoc evaluation", "INVALID_MODE");
  }

  if (session.status === "COMPLETED" || session.status === "ARCHIVED") {
    throw new AdhocEvaluationServiceError(
      "Cannot add items to a completed or archived session",
      "SESSION_CLOSED",
    );
  }

  const existingItems = await prisma.evaluationSessionIdea.findMany({
    where: { sessionId: input.sessionId },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });

  const maxSortOrder = existingItems[0]?.sortOrder ?? -1;

  const createdItems = await prisma.$transaction(
    input.items.map((item, i) =>
      prisma.evaluationSessionIdea.create({
        data: {
          sessionId: input.sessionId,
          ideaId: null,
          adHocTitle: item.title,
          adHocDescription: item.description ?? null,
          sortOrder: maxSortOrder + 1 + i,
        },
      }),
    ),
  );

  childLogger.info(
    { sessionId: input.sessionId, count: createdItems.length },
    "Items added to ad-hoc evaluation",
  );

  return {
    added: createdItems.length,
    items: createdItems.map((item) => ({
      id: item.id,
      title: item.adHocTitle ?? "",
    })),
  };
}

// ── Create One-Team Evaluation ──────────────────────────────

export async function createOneTeamEvaluation(input: OneTeamCreateInput, createdById: string) {
  for (const criterion of input.criteria) {
    if (criterion.fieldType === "SELECTION_SCALE") {
      if (criterion.scaleMin === undefined || criterion.scaleMax === undefined) {
        throw new AdhocEvaluationServiceError(
          `Criterion "${criterion.title}" requires scaleMin and scaleMax for SELECTION_SCALE type`,
          "INVALID_SCALE_CONFIG",
        );
      }
      if (criterion.scaleMin >= criterion.scaleMax) {
        throw new AdhocEvaluationServiceError(
          `Criterion "${criterion.title}" scaleMin must be less than scaleMax`,
          "INVALID_SCALE_RANGE",
        );
      }
    }
  }

  const session = await prisma.evaluationSession.create({
    data: {
      campaignId: input.campaignId ?? null,
      title: input.title,
      description: input.description,
      type: "SCORECARD",
      mode: "ONE_TEAM",
      isCollaborative: true,
      facilitatorId: createdById,
      consensusRequired: input.consensusRequired,
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
        })),
      },
      evaluators: {
        create: input.evaluatorIds.map((userId) => ({
          userId,
          assignedBy: createdById,
        })),
      },
    },
    include: {
      criteria: { orderBy: { sortOrder: "asc" } },
      _count: { select: { evaluators: true, ideas: true, responses: true } },
    },
  });

  eventBus.emit("adhocEvaluation.created", {
    entity: "evaluationSession",
    entityId: session.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: {
      mode: "ONE_TEAM",
      title: session.title,
      consensusRequired: input.consensusRequired,
    },
  });

  childLogger.info(
    { sessionId: session.id, evaluatorCount: input.evaluatorIds.length },
    "One-team evaluation session created",
  );

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    type: session.type,
    mode: session.mode,
    status: session.status,
    isCollaborative: session.isCollaborative,
    facilitatorId: session.facilitatorId,
    consensusRequired: session.consensusRequired,
    criteriaCount: session.criteria.length,
    evaluatorCount: session._count.evaluators,
    ideaCount: session._count.ideas,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// ── Start One-Team Live Session ─────────────────────────────

export async function startOneTeamSession(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    select: {
      id: true,
      mode: true,
      status: true,
      liveSessionStarted: true,
      liveSessionEnded: true,
    },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError("This is not a one-team evaluation", "INVALID_MODE");
  }

  if (session.status !== "ACTIVE") {
    throw new AdhocEvaluationServiceError(
      "Session must be active to start a live session",
      "SESSION_NOT_ACTIVE",
    );
  }

  if (session.liveSessionStarted && !session.liveSessionEnded) {
    throw new AdhocEvaluationServiceError(
      "Live session is already in progress",
      "SESSION_ALREADY_STARTED",
    );
  }

  const now = new Date();
  const updated = await prisma.evaluationSession.update({
    where: { id },
    data: { liveSessionStarted: now, liveSessionEnded: null },
  });

  eventBus.emit("oneTeam.sessionStarted", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: now.toISOString(),
  });

  childLogger.info({ sessionId: id }, "One-team live session started");

  return {
    id: updated.id,
    liveSessionStarted: updated.liveSessionStarted?.toISOString() ?? null,
  };
}

// ── End One-Team Live Session ───────────────────────────────

export async function endOneTeamSession(id: string, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id },
    select: { id: true, mode: true, liveSessionStarted: true, liveSessionEnded: true },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError("This is not a one-team evaluation", "INVALID_MODE");
  }

  if (!session.liveSessionStarted || session.liveSessionEnded) {
    throw new AdhocEvaluationServiceError("No live session in progress", "SESSION_NOT_STARTED");
  }

  const now = new Date();
  const updated = await prisma.evaluationSession.update({
    where: { id },
    data: { liveSessionEnded: now },
  });

  eventBus.emit("oneTeam.sessionEnded", {
    entity: "evaluationSession",
    entityId: id,
    actor,
    timestamp: now.toISOString(),
  });

  childLogger.info({ sessionId: id }, "One-team live session ended");

  return {
    id: updated.id,
    liveSessionEnded: updated.liveSessionEnded?.toISOString() ?? null,
  };
}

// ── Create Consensus Note ───────────────────────────────────

export async function createConsensusNote(input: ConsensusNoteCreateInput, authorId: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, mode: true, status: true },
  });

  if (!session) {
    throw new AdhocEvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.mode !== "ONE_TEAM") {
    throw new AdhocEvaluationServiceError("This is not a one-team evaluation", "INVALID_MODE");
  }

  if (session.status !== "ACTIVE") {
    throw new AdhocEvaluationServiceError(
      "Notes can only be added to active sessions",
      "SESSION_NOT_ACTIVE",
    );
  }

  const note = await prisma.consensusNote.create({
    data: {
      sessionId: input.sessionId,
      ideaId: input.ideaId,
      authorId,
      content: input.content,
    },
  });

  eventBus.emit("oneTeam.consensusNoteAdded", {
    entity: "consensusNote",
    entityId: note.id,
    actor: authorId,
    timestamp: new Date().toISOString(),
    metadata: { sessionId: input.sessionId, ideaId: input.ideaId },
  });

  childLogger.info({ noteId: note.id, sessionId: input.sessionId }, "Consensus note created");

  return {
    id: note.id,
    sessionId: note.sessionId,
    ideaId: note.ideaId,
    authorId: note.authorId,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  };
}

// ── List Consensus Notes ────────────────────────────────────

export async function listConsensusNotes(input: ConsensusNoteListInput) {
  const notes = await prisma.consensusNote.findMany({
    where: {
      sessionId: input.sessionId,
      ideaId: input.ideaId,
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    items: notes.map((n) => ({
      id: n.id,
      sessionId: n.sessionId,
      ideaId: n.ideaId,
      authorId: n.authorId,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}
