import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { IdeaStatus, ShortlistForwardTarget } from "@prisma/client";
import {
  EvaluationServiceError,
  type ShortlistAddItemInput,
  type ShortlistRemoveItemInput,
  type ShortlistLockInput,
  type ShortlistGetInput,
  type ShortlistForwardInput,
  type ShortlistForwardAllInput,
  type EvaluationResultsInput,
} from "./evaluation.schemas";

const childLogger = logger.child({ service: "results" });

// ── Enhanced Results Engine ──────────────────────────────

const CONTROVERSIAL_STD_DEV_THRESHOLD = 1.5;

export async function getEnhancedResults(input: EvaluationResultsInput) {
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
      shortlistItems: {
        select: { ideaId: true },
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
  const shortlistedIdeaIds = new Set(session.shortlistItems.map((s) => s.ideaId));

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

      // Normalize to 0-100 scale based on criterion scale range
      const scaleMin = criterion.scaleMin ?? 1;
      const scaleMax = criterion.scaleMax ?? 5;
      const normalizedAvg =
        scaleMax > scaleMin ? ((avg - scaleMin) / (scaleMax - scaleMin)) * 100 : 0;

      return {
        criterionId: criterion.id,
        criterionTitle: criterion.title,
        weight: criterion.weight,
        average: Math.round(avg * 100) / 100,
        normalizedAverage: Math.round(normalizedAvg * 100) / 100,
        standardDeviation: Math.round(stdDev * 100) / 100,
        isControversial: stdDev >= CONTROVERSIAL_STD_DEV_THRESHOLD,
        responseCount: count,
        min: count > 0 ? Math.min(...scores) : null,
        max: count > 0 ? Math.max(...scores) : null,
      };
    });

    const weightedScore =
      totalWeight > 0
        ? criteriaScores.reduce((sum, cs) => sum + (cs.average * cs.weight) / totalWeight, 0)
        : 0;

    // Normalize weighted score to 0-100 scale
    const normalizedWeightedScore =
      totalWeight > 0
        ? criteriaScores.reduce(
            (sum, cs) => sum + (cs.normalizedAverage * cs.weight) / totalWeight,
            0,
          )
        : 0;

    // Overall standard deviation across all criteria scores for this idea
    const allScores = ideaResponses.filter((r) => r.scoreValue !== null).map((r) => r.scoreValue!);
    const overallAvg =
      allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
    const overallStdDev =
      allScores.length > 1
        ? Math.sqrt(
            allScores.reduce((sum, s) => sum + (s - overallAvg) ** 2, 0) / (allScores.length - 1),
          )
        : 0;

    return {
      ideaId: sessionIdea.ideaId,
      ideaTitle: sessionIdea.idea.title,
      ideaTeaser: sessionIdea.idea.teaser,
      ideaStatus: sessionIdea.idea.status,
      weightedScore: Math.round(weightedScore * 100) / 100,
      normalizedScore: Math.round(normalizedWeightedScore * 100) / 100,
      overallStdDev: Math.round(overallStdDev * 100) / 100,
      isControversial: overallStdDev >= CONTROVERSIAL_STD_DEV_THRESHOLD,
      isShortlisted: shortlistedIdeaIds.has(sessionIdea.ideaId),
      criteriaScores,
    };
  });

  // Sort by weighted score descending
  ideaResults.sort((a, b) => b.weightedScore - a.weightedScore);

  // Add ranking
  const rankedResults = ideaResults.map((r, index) => ({
    ...r,
    rank: index + 1,
  }));

  return {
    sessionId: session.id,
    sessionTitle: session.title,
    type: session.type,
    status: session.status,
    shortlistLocked: session.shortlistLocked,
    criteria: session.criteria.map((c) => ({
      id: c.id,
      title: c.title,
      fieldType: c.fieldType,
      weight: c.weight,
      scaleMin: c.scaleMin,
      scaleMax: c.scaleMax,
    })),
    results: rankedResults,
  };
}

// ── Shortlist Management ─────────────────────────────────

export async function getShortlist(input: ShortlistGetInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      shortlistLocked: true,
      shortlistLockedAt: true,
      shortlistLockedById: true,
      shortlistItems: {
        include: {
          idea: {
            select: { id: true, title: true, teaser: true, status: true },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  return {
    sessionId: session.id,
    isLocked: session.shortlistLocked,
    lockedAt: session.shortlistLockedAt?.toISOString() ?? null,
    lockedById: session.shortlistLockedById,
    items: session.shortlistItems.map((item) => ({
      id: item.id,
      ideaId: item.ideaId,
      ideaTitle: item.idea.title,
      ideaTeaser: item.idea.teaser,
      ideaStatus: item.idea.status,
      addedById: item.addedById,
      addedAt: item.addedAt.toISOString(),
      forwardedTo: item.forwardedTo,
      forwardedAt: item.forwardedAt?.toISOString() ?? null,
    })),
  };
}

export async function addToShortlist(input: ShortlistAddItemInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.shortlistLocked) {
    throw new EvaluationServiceError("Shortlist is locked", "SHORTLIST_LOCKED");
  }

  const sessionIdea = await prisma.evaluationSessionIdea.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (!sessionIdea) {
    throw new EvaluationServiceError("Idea not found in this session", "IDEA_NOT_IN_SESSION");
  }

  const existing = await prisma.evaluationShortlistItem.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (existing) {
    return { added: false, alreadyExists: true };
  }

  await prisma.evaluationShortlistItem.create({
    data: {
      sessionId: input.sessionId,
      ideaId: input.ideaId,
      addedById: actor,
    },
  });

  eventBus.emit("evaluation.shortlistItemAdded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, ideaId: input.ideaId },
  });

  childLogger.info({ sessionId: input.sessionId, ideaId: input.ideaId }, "Idea added to shortlist");

  return { added: true, alreadyExists: false };
}

export async function removeFromShortlist(input: ShortlistRemoveItemInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.shortlistLocked) {
    throw new EvaluationServiceError("Shortlist is locked", "SHORTLIST_LOCKED");
  }

  const item = await prisma.evaluationShortlistItem.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (!item) {
    throw new EvaluationServiceError("Idea not in shortlist", "NOT_IN_SHORTLIST");
  }

  await prisma.evaluationShortlistItem.delete({ where: { id: item.id } });

  eventBus.emit("evaluation.shortlistItemRemoved", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, ideaId: input.ideaId },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId },
    "Idea removed from shortlist",
  );

  return { removed: true };
}

export async function lockShortlist(input: ShortlistLockInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.shortlistLocked) {
    throw new EvaluationServiceError("Shortlist is already locked", "SHORTLIST_ALREADY_LOCKED");
  }

  await prisma.evaluationSession.update({
    where: { id: input.sessionId },
    data: {
      shortlistLocked: true,
      shortlistLockedAt: new Date(),
      shortlistLockedById: actor,
    },
  });

  eventBus.emit("evaluation.shortlistLocked", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId },
  });

  childLogger.info({ sessionId: input.sessionId }, "Shortlist locked");

  return { locked: true };
}

// Map forward target to idea status
const FORWARD_TARGET_MAP: Record<ShortlistForwardTarget, IdeaStatus> = {
  SELECTED_IMPLEMENTATION: "SELECTED_IMPLEMENTATION",
  CONCEPT: "EVALUATION",
  ARCHIVED: "ARCHIVED",
};

export async function forwardShortlistItem(input: ShortlistForwardInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (!session.shortlistLocked) {
    throw new EvaluationServiceError(
      "Shortlist must be locked before forwarding",
      "SHORTLIST_NOT_LOCKED",
    );
  }

  const item = await prisma.evaluationShortlistItem.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (!item) {
    throw new EvaluationServiceError("Idea not in shortlist", "NOT_IN_SHORTLIST");
  }

  const targetStatus =
    FORWARD_TARGET_MAP[input.destination as unknown as ShortlistForwardTarget] ?? "EVALUATION";

  await prisma.$transaction([
    prisma.evaluationShortlistItem.update({
      where: { id: item.id },
      data: {
        forwardedTo: input.destination as unknown as ShortlistForwardTarget,
        forwardedAt: new Date(),
      },
    }),
    prisma.idea.update({
      where: { id: input.ideaId },
      data: {
        status: targetStatus,
        previousStatus: undefined,
      },
    }),
  ]);

  eventBus.emit("evaluation.shortlistForwarded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: session.campaignId,
      ideaId: input.ideaId,
      destination: input.destination,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId, destination: input.destination },
    "Shortlist idea forwarded",
  );

  return { forwarded: true, destination: input.destination };
}

export async function forwardAllShortlistItems(input: ShortlistForwardAllInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (!session.shortlistLocked) {
    throw new EvaluationServiceError(
      "Shortlist must be locked before forwarding",
      "SHORTLIST_NOT_LOCKED",
    );
  }

  const items = await prisma.evaluationShortlistItem.findMany({
    where: {
      sessionId: input.sessionId,
      forwardedTo: null,
    },
    select: { id: true, ideaId: true },
  });

  if (items.length === 0) {
    return { forwarded: 0 };
  }

  const targetStatus = FORWARD_TARGET_MAP[input.target as ShortlistForwardTarget];

  await prisma.$transaction([
    prisma.evaluationShortlistItem.updateMany({
      where: {
        sessionId: input.sessionId,
        forwardedTo: null,
      },
      data: {
        forwardedTo: input.target as ShortlistForwardTarget,
        forwardedAt: new Date(),
      },
    }),
    ...items.map((item) =>
      prisma.idea.update({
        where: { id: item.ideaId },
        data: { status: targetStatus },
      }),
    ),
  ]);

  eventBus.emit("evaluation.shortlistForwarded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: session.campaignId,
      ideaIds: items.map((i) => i.ideaId),
      target: input.target,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, count: items.length, target: input.target },
    "All shortlist items forwarded",
  );

  return { forwarded: items.length };
}
