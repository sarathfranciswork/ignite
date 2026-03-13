import { z } from "zod";

export const scoreIdeaInput = z.object({
  ideaId: z.string().min(1),
});

export type ScoreIdeaInput = z.infer<typeof scoreIdeaInput>;

export const batchScoreIdeasInput = z.object({
  campaignId: z.string().min(1),
});

export type BatchScoreIdeasInput = z.infer<typeof batchScoreIdeasInput>;

export const getIdeaScoreInput = z.object({
  ideaId: z.string().min(1),
});

export type GetIdeaScoreInput = z.infer<typeof getIdeaScoreInput>;

export const getScoreHistoryInput = z.object({
  ideaId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type GetScoreHistoryInput = z.infer<typeof getScoreHistoryInput>;

export const getCampaignScoreDistributionInput = z.object({
  campaignId: z.string().min(1),
});

export type GetCampaignScoreDistributionInput = z.infer<typeof getCampaignScoreDistributionInput>;

export interface PredictiveScoreResponse {
  id: string;
  ideaId: string;
  overallScore: number;
  feasibilityScore: number;
  impactScore: number;
  alignmentScore: number;
  confidenceLevel: number;
  reasoning: string;
  modelVersion: string;
  scoredAt: string;
}

export interface ScoreDistribution {
  campaignId: string;
  totalScored: number;
  averageScore: number;
  medianScore: number;
  distribution: {
    range: string;
    count: number;
  }[];
}
