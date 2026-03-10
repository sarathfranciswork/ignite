import { z } from "zod";

export const pairwiseScoreSchema = z.object({
  criterionId: z.string().min(1),
  score: z.number().min(-1).max(1),
});

export const pairwiseSubmissionSchema = z.object({
  sessionId: z.string().min(1),
  ideaAId: z.string().min(1),
  ideaBId: z.string().min(1),
  scores: z.array(pairwiseScoreSchema).min(1),
});

export type PairwiseScoreInput = z.infer<typeof pairwiseScoreSchema>;
export type PairwiseSubmissionInput = z.infer<typeof pairwiseSubmissionSchema>;
