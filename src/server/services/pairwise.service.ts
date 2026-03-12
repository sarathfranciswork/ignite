import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import {
  EvaluationServiceError,
  type PairwiseSubmitComparisonInput,
  type PairwiseGetNextPairInput,
  type PairwiseGetPairsInput,
  type PairwiseGetMyComparisonInput,
  type PairwiseProgressInput,
  type PairwiseResultsInput,
} from "./evaluation.schemas";

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

  eventBus.emit("evaluation.responseSubmitted", {
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

// ── Get My Comparison for a Pair ─────────────────────────────

export async function getMyComparison(input: PairwiseGetMyComparisonInput, evaluatorId: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, type: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  // Ensure consistent ordering
  const [orderedA, orderedB] =
    input.ideaAId < input.ideaBId ? [input.ideaAId, input.ideaBId] : [input.ideaBId, input.ideaAId];

  const needsFlip = orderedA !== input.ideaAId;

  const comparisons = await prisma.pairwiseComparison.findMany({
    where: {
      sessionId: input.sessionId,
      evaluatorId,
      ideaAId: orderedA,
      ideaBId: orderedB,
    },
  });

  return {
    comparisons: comparisons.map((c) => ({
      criterionId: c.criterionId,
      score: needsFlip ? -c.score : c.score,
      updatedAt: c.updatedAt.toISOString(),
    })),
  };
}

// ── Pairwise Progress ────────────────────────────────────────

export async function getPairwiseProgress(input: PairwiseProgressInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    include: {
      evaluators: { select: { userId: true } },
      ideas: { select: { ideaId: true }, orderBy: { sortOrder: "asc" } },
      criteria: { select: { id: true } },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  const ideaIds = session.ideas.map((i) => i.ideaId);
  const pairs = generatePairsFromIdeas(ideaIds);
  const criteriaCount = session.criteria.length;
  const expectedPerEvaluator = pairs.length * criteriaCount;
  const totalExpected = session.evaluators.length * expectedPerEvaluator;

  const responses = await prisma.pairwiseComparison.groupBy({
    by: ["evaluatorId"],
    where: { sessionId: input.sessionId },
    _count: { id: true },
  });

  const responseMap = new Map(responses.map((r) => [r.evaluatorId, r._count.id]));

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
    totalPairs: pairs.length,
    evaluatorProgress,
    overall: {
      completed: totalCompleted,
      total: totalExpected,
      percentage: totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0,
    },
  };
}

// ── Pairwise Results (Bradley-Terry Ranking) ─────────────────

/**
 * Compute Bradley-Terry model scores from pairwise comparisons.
 * Uses iterative algorithm to find maximum likelihood estimates
 * of idea "strength" parameters.
 */
function computeBradleyTerryScores(
  ideaIds: string[],
  comparisons: Array<{ ideaAId: string; ideaBId: string; score: number }>,
  maxIterations: number = 100,
  tolerance: number = 1e-6,
): Map<string, number> {
  const n = ideaIds.length;
  if (n === 0) return new Map();

  const indexMap = new Map(ideaIds.map((id, i) => [id, i]));

  // Initialize strength parameters (all equal)
  const strength = new Float64Array(n).fill(1.0);

  // Aggregate win counts and matchup counts
  // wins[i] = total wins for idea i (score > 0 means ideaA wins, score < 0 means ideaB wins)
  const wins = new Float64Array(n);
  const matchups = Array.from({ length: n }, () => new Float64Array(n));

  for (const comp of comparisons) {
    const a = indexMap.get(comp.ideaAId);
    const b = indexMap.get(comp.ideaBId);
    if (a === undefined || b === undefined) continue;

    if (comp.score > 0) {
      // ideaA is preferred, weight by score magnitude
      wins[a] += Math.abs(comp.score);
      matchups[a][b] += Math.abs(comp.score);
      matchups[b][a] += Math.abs(comp.score);
    } else if (comp.score < 0) {
      // ideaB is preferred
      wins[b] += Math.abs(comp.score);
      matchups[a][b] += Math.abs(comp.score);
      matchups[b][a] += Math.abs(comp.score);
    } else {
      // Tie: split evenly
      wins[a] += 0.5;
      wins[b] += 0.5;
      matchups[a][b] += 1;
      matchups[b][a] += 1;
    }
  }

  // Iterative Bradley-Terry update
  for (let iter = 0; iter < maxIterations; iter++) {
    const newStrength = new Float64Array(n);
    let maxDiff = 0;

    for (let i = 0; i < n; i++) {
      let denom = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const totalGames = matchups[i][j];
        if (totalGames > 0) {
          denom += totalGames / (strength[i] + strength[j]);
        }
      }

      newStrength[i] = denom > 0 ? wins[i] / denom : strength[i];
      maxDiff = Math.max(maxDiff, Math.abs(newStrength[i] - strength[i]));
    }

    // Normalize so they sum to n
    const sum = newStrength.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < n; i++) {
        newStrength[i] = (newStrength[i] / sum) * n;
      }
    }

    for (let i = 0; i < n; i++) {
      strength[i] = newStrength[i];
    }

    if (maxDiff < tolerance) break;
  }

  const result = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    result.set(ideaIds[i], Math.round(strength[i] * 100) / 100);
  }
  return result;
}

export async function getPairwiseResults(input: PairwiseResultsInput) {
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

  const comparisons = await prisma.pairwiseComparison.findMany({
    where: { sessionId: input.sessionId },
  });

  const ideaIds = session.ideas.map((i) => i.ideaId);
  const scoreCriteria = session.criteria.filter((c) => c.fieldType === "SELECTION_SCALE");

  // Compute per-criterion Bradley-Terry scores
  const criteriaResults = scoreCriteria.map((criterion) => {
    const criterionComps = comparisons.filter((c) => c.criterionId === criterion.id);
    const scores = computeBradleyTerryScores(ideaIds, criterionComps);
    return {
      criterionId: criterion.id,
      criterionTitle: criterion.title,
      weight: criterion.weight,
      scores: Object.fromEntries(scores),
      comparisonCount: criterionComps.length,
    };
  });

  // Compute overall Bradley-Terry scores (all comparisons combined, weighted)
  const overallScores = computeBradleyTerryScores(ideaIds, comparisons);

  // Build per-idea results
  const totalWeight = scoreCriteria.reduce((sum, c) => sum + c.weight, 0);

  const ideaResults = session.ideas.map((sessionIdea) => {
    const ideaId = sessionIdea.ideaId;

    // Weighted score from per-criterion BT scores
    let weightedScore = 0;
    if (totalWeight > 0) {
      for (const cr of criteriaResults) {
        const ideaScore = cr.scores[ideaId] ?? 1.0;
        weightedScore += (ideaScore * cr.weight) / totalWeight;
      }
    }

    // Win/loss record
    const ideaComparisons = comparisons.filter((c) => c.ideaAId === ideaId || c.ideaBId === ideaId);
    let wins = 0;
    let losses = 0;
    let ties = 0;
    for (const c of ideaComparisons) {
      if (c.score === 0) {
        ties++;
      } else if ((c.ideaAId === ideaId && c.score > 0) || (c.ideaBId === ideaId && c.score < 0)) {
        wins++;
      } else {
        losses++;
      }
    }

    return {
      ideaId,
      ideaTitle: sessionIdea.idea.title,
      ideaTeaser: sessionIdea.idea.teaser,
      ideaStatus: sessionIdea.idea.status,
      btScore: overallScores.get(ideaId) ?? 1.0,
      weightedScore: Math.round(weightedScore * 100) / 100,
      record: { wins, losses, ties },
      criteriaScores: criteriaResults.map((cr) => ({
        criterionId: cr.criterionId,
        criterionTitle: cr.criterionTitle,
        score: cr.scores[ideaId] ?? 1.0,
      })),
    };
  });

  // Sort by weighted score descending
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
    criteriaResults,
  };
}
