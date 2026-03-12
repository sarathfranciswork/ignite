import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import {
  EvaluationServiceError,
  type PairwiseSubmitComparisonInput,
  type PairwiseGetNextPairInput,
  type PairwiseGetPairsInput,
} from "./evaluation.schemas";

export {
  computeBradleyTerryScores,
  getPairwiseResults,
  getPairwiseProgress,
  getMyComparison,
} from "./pairwise-ranking.service";

const childLogger = logger.child({ service: "pairwise" });

// ── Pair Generation ─────────────────────────────────────────

interface IdeaPair {
  ideaAId: string;
  ideaBId: string;
  index: number;
}

/**
 * Generate all unique pairs from session ideas in a deterministic order.
 * For N ideas, produces N*(N-1)/2 pairs.
 */
export function generatePairsFromIdeas(ideaIds: string[]): IdeaPair[] {
  const pairs: IdeaPair[] = [];
  let index = 0;
  for (let i = 0; i < ideaIds.length; i++) {
    for (let j = i + 1; j < ideaIds.length; j++) {
      pairs.push({
        ideaAId: ideaIds[i],
        ideaBId: ideaIds[j],
        index,
      });
      index++;
    }
  }
  return pairs;
}

// ── Get All Pairs for Session ────────────────────────────────

export async function getPairwisePairs(input: PairwiseGetPairsInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    include: {
      ideas: {
        select: {
          ideaId: true,
          sortOrder: true,
          idea: { select: { id: true, title: true, teaser: true, status: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.type !== "PAIRWISE") {
    throw new EvaluationServiceError(
      "This endpoint is only for pairwise sessions",
      "SESSION_NOT_PAIRWISE",
    );
  }

  const ideaIds = session.ideas.map((i) => i.ideaId);
  const pairs = generatePairsFromIdeas(ideaIds);

  const ideaMap = new Map(session.ideas.map((i) => [i.ideaId, i.idea]));

  return {
    sessionId: session.id,
    totalPairs: pairs.length,
    pairs: pairs.map((p) => ({
      index: p.index,
      ideaA: ideaMap.get(p.ideaAId)!,
      ideaB: ideaMap.get(p.ideaBId)!,
    })),
  };
}

// ── Get Next Incomplete Pair for Evaluator ───────────────────

export async function getNextPair(input: PairwiseGetNextPairInput, evaluatorId: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    include: {
      criteria: { select: { id: true }, orderBy: { sortOrder: "asc" } },
      ideas: {
        select: {
          ideaId: true,
          idea: { select: { id: true, title: true, teaser: true, status: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.type !== "PAIRWISE") {
    throw new EvaluationServiceError(
      "This endpoint is only for pairwise sessions",
      "SESSION_NOT_PAIRWISE",
    );
  }

  const evaluator = await prisma.evaluationSessionEvaluator.findUnique({
    where: {
      sessionId_userId: { sessionId: input.sessionId, userId: evaluatorId },
    },
  });

  if (!evaluator) {
    throw new EvaluationServiceError("You are not an evaluator for this session", "NOT_EVALUATOR");
  }

  const ideaIds = session.ideas.map((i) => i.ideaId);
  const pairs = generatePairsFromIdeas(ideaIds);
  const criteriaCount = session.criteria.length;

  if (pairs.length === 0 || criteriaCount === 0) {
    return { pair: null, pairIndex: -1, totalPairs: 0, completed: true };
  }

  // Get all existing comparisons for this evaluator
  const existingComparisons = await prisma.pairwiseComparison.findMany({
    where: { sessionId: input.sessionId, evaluatorId },
    select: { ideaAId: true, ideaBId: true, criterionId: true },
  });

  // Build a set of completed pair+criterion combos
  const completedSet = new Set(
    existingComparisons.map((c) => `${c.ideaAId}:${c.ideaBId}:${c.criterionId}`),
  );

  // Find first pair where not all criteria have been compared
  for (const pair of pairs) {
    const allCriteriaCompleted = session.criteria.every((criterion) =>
      completedSet.has(`${pair.ideaAId}:${pair.ideaBId}:${criterion.id}`),
    );

    if (!allCriteriaCompleted) {
      const ideaMap = new Map(session.ideas.map((i) => [i.ideaId, i.idea]));
      return {
        pair: {
          ideaA: ideaMap.get(pair.ideaAId)!,
          ideaB: ideaMap.get(pair.ideaBId)!,
        },
        pairIndex: pair.index,
        totalPairs: pairs.length,
        completed: false,
      };
    }
  }

  return { pair: null, pairIndex: -1, totalPairs: pairs.length, completed: true };
}

// ── Submit Pairwise Comparison ───────────────────────────────

export async function submitPairwiseComparison(
  input: PairwiseSubmitComparisonInput,
  evaluatorId: string,
) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true, type: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.type !== "PAIRWISE") {
    throw new EvaluationServiceError(
      "This endpoint is only for pairwise sessions",
      "SESSION_NOT_PAIRWISE",
    );
  }

  if (session.status !== "ACTIVE") {
    throw new EvaluationServiceError(
      "Comparisons can only be submitted to active sessions",
      "SESSION_NOT_ACTIVE",
    );
  }

  const evaluator = await prisma.evaluationSessionEvaluator.findUnique({
    where: {
      sessionId_userId: { sessionId: input.sessionId, userId: evaluatorId },
    },
  });

  if (!evaluator) {
    throw new EvaluationServiceError("You are not an evaluator for this session", "NOT_EVALUATOR");
  }

  // Verify both ideas are in the session
  const sessionIdeas = await prisma.evaluationSessionIdea.findMany({
    where: {
      sessionId: input.sessionId,
      ideaId: { in: [input.ideaAId, input.ideaBId] },
    },
    select: { ideaId: true },
  });

  if (sessionIdeas.length < 2) {
    throw new EvaluationServiceError(
      "One or both ideas are not in this session",
      "IDEA_NOT_IN_SESSION",
    );
  }

  // Ensure consistent ordering (ideaAId < ideaBId lexicographically)
  const [orderedA, orderedB] =
    input.ideaAId < input.ideaBId ? [input.ideaAId, input.ideaBId] : [input.ideaBId, input.ideaAId];

  const needsFlip = orderedA !== input.ideaAId;

  const upserts = input.comparisons.map((c) => {
    // If we flipped the order, negate the score
    const adjustedScore = needsFlip ? -c.score : c.score;

    return prisma.pairwiseComparison.upsert({
      where: {
        sessionId_evaluatorId_criterionId_ideaAId_ideaBId: {
          sessionId: input.sessionId,
          evaluatorId,
          criterionId: c.criterionId,
          ideaAId: orderedA,
          ideaBId: orderedB,
        },
      },
      create: {
        sessionId: input.sessionId,
        evaluatorId,
        criterionId: c.criterionId,
        ideaAId: orderedA,
        ideaBId: orderedB,
        score: adjustedScore,
      },
      update: {
        score: adjustedScore,
      },
    });
  });

  await prisma.$transaction(upserts);

  eventBus.emit("evaluation.pairwiseComparisonSubmitted", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor: evaluatorId,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: session.campaignId,
      type: "pairwise",
      ideaAId: orderedA,
      ideaBId: orderedB,
      comparisonCount: input.comparisons.length,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, evaluatorId, ideaAId: orderedA, ideaBId: orderedB },
    "Pairwise comparison submitted",
  );

  return { saved: input.comparisons.length };
}


