import { prisma } from "@/server/lib/prisma";
import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  ScoreIdeaInput,
  BatchScoreIdeasInput,
  GetIdeaScoreInput,
  GetScoreHistoryInput,
  GetCampaignScoreDistributionInput,
  PredictiveScoreResponse,
  ScoreDistribution,
} from "./ai-scoring.schemas";

const childLogger = logger.child({ service: "ai-scoring" });

const MODEL_VERSION = "v1.0-predictive";

export class AiScoringServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AiScoringServiceError";
  }
}

function mapScoreToResponse(score: {
  id: string;
  ideaId: string;
  overallScore: number;
  feasibilityScore: number;
  impactScore: number;
  alignmentScore: number;
  confidenceLevel: number;
  reasoning: string;
  modelVersion: string;
  scoredAt: Date;
}): PredictiveScoreResponse {
  return {
    id: score.id,
    ideaId: score.ideaId,
    overallScore: score.overallScore,
    feasibilityScore: score.feasibilityScore,
    impactScore: score.impactScore,
    alignmentScore: score.alignmentScore,
    confidenceLevel: score.confidenceLevel,
    reasoning: score.reasoning,
    modelVersion: score.modelVersion,
    scoredAt: score.scoredAt.toISOString(),
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

interface ParsedScores {
  feasibilityScore: number;
  impactScore: number;
  alignmentScore: number;
  confidenceLevel: number;
  reasoning: string;
}

function parseAiScores(text: string): ParsedScores {
  const feasibilityMatch = text.match(/feasibility[:\s]*(\d+(?:\.\d+)?)/i);
  const impactMatch = text.match(/impact[:\s]*(\d+(?:\.\d+)?)/i);
  const alignmentMatch = text.match(/alignment[:\s]*(\d+(?:\.\d+)?)/i);
  const confidenceMatch = text.match(/confidence[:\s]*(\d+(?:\.\d+)?)/i);

  const feasibilityScore = feasibilityMatch ? clampScore(parseFloat(feasibilityMatch[1])) : 50;
  const impactScore = impactMatch ? clampScore(parseFloat(impactMatch[1])) : 50;
  const alignmentScore = alignmentMatch ? clampScore(parseFloat(alignmentMatch[1])) : 50;
  const confidenceRaw = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
  const confidenceLevel = clampConfidence(confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw);

  const reasoningMatch = text.match(
    /reasoning[:\s]*([\s\S]+?)(?=\n(?:feasibility|impact|alignment|confidence)|$)/i,
  );
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : text.slice(0, 500);

  return { feasibilityScore, impactScore, alignmentScore, confidenceLevel, reasoning };
}

function generateRuleBasedScores(idea: {
  title: string;
  description: string | null;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
}): ParsedScores {
  const hasDescription = (idea.description?.length ?? 0) > 50;
  const hasDetailedDescription = (idea.description?.length ?? 0) > 200;
  const hasTags = idea.tags.length > 0;
  const hasEngagement = idea.likesCount > 0 || idea.commentsCount > 0;

  let feasibilityScore = 40;
  if (hasDescription) feasibilityScore += 15;
  if (hasDetailedDescription) feasibilityScore += 10;
  if (hasTags) feasibilityScore += 5;

  let impactScore = 35;
  if (hasEngagement) impactScore += 15;
  impactScore += Math.min(20, idea.likesCount * 2);
  impactScore += Math.min(10, idea.commentsCount * 3);

  let alignmentScore = 45;
  if (hasTags) alignmentScore += 10;
  if (hasDescription) alignmentScore += 5;

  const reasoning = `Rule-based scoring: Idea has ${idea.description?.length ?? 0} chars description, ${idea.tags.length} tags, ${idea.likesCount} likes, ${idea.commentsCount} comments.`;

  return {
    feasibilityScore: clampScore(feasibilityScore),
    impactScore: clampScore(impactScore),
    alignmentScore: clampScore(alignmentScore),
    confidenceLevel: 0.3,
    reasoning,
  };
}

export async function scoreIdea(
  input: ScoreIdeaInput,
  actorId: string,
): Promise<PredictiveScoreResponse> {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    include: { campaign: { select: { id: true, title: true, description: true } } },
  });

  if (!idea) {
    throw new AiScoringServiceError("IDEA_NOT_FOUND", "Idea not found");
  }

  let scores: ParsedScores;

  if (aiProvider.supportsTextGeneration()) {
    try {
      const prompt = buildScoringPrompt(
        idea.title,
        idea.description ?? "",
        idea.tags,
        idea.campaign.title,
        idea.campaign.description ?? "",
      );

      const result = await aiProvider.generateText(prompt, SCORING_SYSTEM_PROMPT);
      if (result) {
        scores = parseAiScores(result.text);
      } else {
        scores = generateRuleBasedScores(idea);
      }
    } catch (error) {
      childLogger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "AI scoring failed — using rule-based fallback",
      );
      scores = generateRuleBasedScores(idea);
    }
  } else {
    scores = generateRuleBasedScores(idea);
  }

  const overallScore = clampScore(
    scores.feasibilityScore * 0.3 + scores.impactScore * 0.4 + scores.alignmentScore * 0.3,
  );

  const record = await prisma.predictiveScore.create({
    data: {
      ideaId: input.ideaId,
      overallScore,
      feasibilityScore: scores.feasibilityScore,
      impactScore: scores.impactScore,
      alignmentScore: scores.alignmentScore,
      confidenceLevel: scores.confidenceLevel,
      reasoning: scores.reasoning,
      modelVersion: MODEL_VERSION,
    },
  });

  eventBus.emit("ai.ideaScored", {
    entity: "predictiveScore",
    entityId: record.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: input.ideaId, overallScore },
  });

  childLogger.info({ ideaId: input.ideaId, overallScore }, "Idea scored");

  return mapScoreToResponse(record);
}

export async function batchScoreIdeas(
  input: BatchScoreIdeasInput,
  actorId: string,
): Promise<{ scored: number; errors: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
  });

  if (!campaign) {
    throw new AiScoringServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const unscoredIdeas = await prisma.idea.findMany({
    where: {
      campaignId: input.campaignId,
      predictiveScores: { none: {} },
    },
    select: { id: true },
    take: 100,
  });

  let scored = 0;
  let errors = 0;

  for (const idea of unscoredIdeas) {
    try {
      await scoreIdea({ ideaId: idea.id }, actorId);
      scored++;
    } catch (error) {
      childLogger.warn(
        { ideaId: idea.id, error: error instanceof Error ? error.message : String(error) },
        "Failed to score idea in batch",
      );
      errors++;
    }
  }

  childLogger.info({ campaignId: input.campaignId, scored, errors }, "Batch scoring completed");

  return { scored, errors };
}

export async function getIdeaScore(
  input: GetIdeaScoreInput,
): Promise<PredictiveScoreResponse | null> {
  const score = await prisma.predictiveScore.findFirst({
    where: { ideaId: input.ideaId },
    orderBy: { scoredAt: "desc" },
  });

  if (!score) return null;
  return mapScoreToResponse(score);
}

export async function getScoreHistory(
  input: GetScoreHistoryInput,
): Promise<{ items: PredictiveScoreResponse[]; nextCursor?: string }> {
  const take = input.limit + 1;

  const scores = await prisma.predictiveScore.findMany({
    where: { ideaId: input.ideaId },
    orderBy: { scoredAt: "desc" },
    take,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;
  if (scores.length > input.limit) {
    const nextItem = scores.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items: scores.map(mapScoreToResponse),
    nextCursor,
  };
}

export async function getCampaignScoreDistribution(
  input: GetCampaignScoreDistributionInput,
): Promise<ScoreDistribution> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
  });

  if (!campaign) {
    throw new AiScoringServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const latestScores = await prisma.$queryRaw<{ overall_score: number }[]>`
    SELECT DISTINCT ON (ps.idea_id) ps.overall_score
    FROM predictive_scores ps
    JOIN ideas i ON i.id = ps.idea_id
    WHERE i.campaign_id = ${input.campaignId}
    ORDER BY ps.idea_id, ps.scored_at DESC
  `;

  const scores = latestScores.map((s) => s.overall_score);
  const totalScored = scores.length;

  if (totalScored === 0) {
    return {
      campaignId: input.campaignId,
      totalScored: 0,
      averageScore: 0,
      medianScore: 0,
      distribution: [],
    };
  }

  const averageScore = scores.reduce((sum, s) => sum + s, 0) / totalScored;
  const sorted = [...scores].sort((a, b) => a - b);
  const medianScore =
    totalScored % 2 === 0
      ? (sorted[totalScored / 2 - 1] + sorted[totalScored / 2]) / 2
      : sorted[Math.floor(totalScored / 2)];

  const ranges = [
    { range: "0-20", min: 0, max: 20 },
    { range: "20-40", min: 20, max: 40 },
    { range: "40-60", min: 40, max: 60 },
    { range: "60-80", min: 60, max: 80 },
    { range: "80-100", min: 80, max: 100 },
  ];

  const distribution = ranges.map(({ range, min, max }) => ({
    range,
    count: scores.filter((s) => s >= min && s < (max === 100 ? 101 : max)).length,
  }));

  return {
    campaignId: input.campaignId,
    totalScored,
    averageScore: Math.round(averageScore * 100) / 100,
    medianScore: Math.round(medianScore * 100) / 100,
    distribution,
  };
}

const SCORING_SYSTEM_PROMPT = `You are an innovation scoring engine. Evaluate ideas on three dimensions:
- Feasibility (0-100): Technical and resource feasibility
- Impact (0-100): Potential business and strategic impact
- Alignment (0-100): Alignment with campaign goals and organizational strategy

Respond in this exact format:
feasibility: <score>
impact: <score>
alignment: <score>
confidence: <0-1>
reasoning: <1-2 sentences explaining the scores>`;

function buildScoringPrompt(
  ideaTitle: string,
  ideaDescription: string,
  tags: string[],
  campaignTitle: string,
  campaignDescription: string,
): string {
  return `Score this innovation idea:

Campaign: ${campaignTitle}
Campaign Description: ${campaignDescription}

Idea Title: ${ideaTitle}
Idea Description: ${ideaDescription}
Tags: ${tags.join(", ") || "none"}

Provide scores for feasibility, impact, and alignment.`;
}
