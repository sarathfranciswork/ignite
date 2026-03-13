import { z } from "zod";

export const categorizeIdeaInput = z.object({
  ideaId: z.string().min(1),
});

export type CategorizeIdeaInput = z.infer<typeof categorizeIdeaInput>;

export const batchCategorizeInput = z.object({
  campaignId: z.string().min(1),
});

export type BatchCategorizeInput = z.infer<typeof batchCategorizeInput>;

export const getSuggestedTagsInput = z.object({
  ideaId: z.string().min(1),
});

export type GetSuggestedTagsInput = z.infer<typeof getSuggestedTagsInput>;

export const acceptTagInput = z.object({
  autoTagId: z.string().min(1),
});

export type AcceptTagInput = z.infer<typeof acceptTagInput>;

export const rejectTagInput = z.object({
  autoTagId: z.string().min(1),
});

export type RejectTagInput = z.infer<typeof rejectTagInput>;

export interface AutoTagResponse {
  id: string;
  ideaId: string;
  tag: string;
  confidence: number;
  source: string;
  isAccepted: boolean | null;
  createdAt: string;
}
