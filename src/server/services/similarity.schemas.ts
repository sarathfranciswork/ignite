import { z } from "zod";

export const findSimilarIdeasInput = z.object({
  ideaId: z.string().min(1, "Idea ID is required"),
  limit: z.number().int().min(1).max(20).default(5),
});

export type FindSimilarIdeasInput = z.infer<typeof findSimilarIdeasInput>;

export const aiStatusInput = z.object({});

export type AiStatusInput = z.infer<typeof aiStatusInput>;
