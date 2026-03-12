import { prisma } from "@/server/lib/prisma";
import { EvaluationServiceError, type EvaluationResultsInput } from "./evaluation.schemas";

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
      ideaId: sessionIdea.ideaId!,
      ideaTitle: sessionIdea.idea!.title,
      ideaTeaser: sessionIdea.idea!.teaser,
      ideaStatus: sessionIdea.idea!.status,
      weightedScore: Math.round(weightedScore * 100) / 100,
      normalizedScore: Math.round(normalizedWeightedScore * 100) / 100,
      overallStdDev: Math.round(overallStdDev * 100) / 100,
      isControversial: overallStdDev >= CONTROVERSIAL_STD_DEV_THRESHOLD,
      isShortlisted: shortlistedIdeaIds.has(sessionIdea.ideaId!),
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
