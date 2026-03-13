import { z } from "zod";

export const generateRecommendationsInput = z.object({
  siaId: z.string().min(1),
});

export type GenerateRecommendationsInput = z.infer<typeof generateRecommendationsInput>;

export const getRecommendationsInput = z.object({
  siaId: z.string().min(1),
  minRelevance: z.number().min(0).max(1).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type GetRecommendationsInput = z.infer<typeof getRecommendationsInput>;

export const dismissRecommendationInput = z.object({
  id: z.string().min(1),
});

export type DismissRecommendationInput = z.infer<typeof dismissRecommendationInput>;

export const linkRecommendationInput = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
});

export type LinkRecommendationInput = z.infer<typeof linkRecommendationInput>;

export interface ScoutingRecommendationResponse {
  id: string;
  siaId: string;
  organizationId: string | null;
  title: string;
  description: string;
  relevanceScore: number;
  reasoning: string;
  source: string;
  isDismissed: boolean;
  createdAt: string;
}
