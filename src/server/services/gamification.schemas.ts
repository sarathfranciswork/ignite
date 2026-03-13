import { z } from "zod";

export const gamificationConfigureInput = z.object({
  campaignId: z.string().min(1),
  isActive: z.boolean().optional(),
  ideaWeight: z.number().int().min(0).max(100).optional(),
  commentWeight: z.number().int().min(0).max(100).optional(),
  likeWeight: z.number().int().min(0).max(100).optional(),
  evaluationWeight: z.number().int().min(0).max(100).optional(),
  showLeaderboard: z.boolean().optional(),
});

export type GamificationConfigureInput = z.infer<typeof gamificationConfigureInput>;

export const gamificationGetConfigInput = z.object({
  campaignId: z.string().min(1),
});

export type GamificationGetConfigInput = z.infer<typeof gamificationGetConfigInput>;

export const gamificationLeaderboardInput = z.object({
  campaignId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export type GamificationLeaderboardInput = z.infer<typeof gamificationLeaderboardInput>;

export const gamificationUserScoreInput = z.object({
  userId: z.string().min(1),
  campaignId: z.string().min(1),
});

export type GamificationUserScoreInput = z.infer<typeof gamificationUserScoreInput>;

export const gamificationRecalculateInput = z.object({
  campaignId: z.string().min(1),
});

export type GamificationRecalculateInput = z.infer<typeof gamificationRecalculateInput>;

export const gamificationResetInput = z.object({
  campaignId: z.string().min(1),
});

export type GamificationResetInput = z.infer<typeof gamificationResetInput>;

export const perspectiveEnum = z.enum([
  "WHITE_FACTS",
  "RED_EMOTION",
  "BLACK_CAUTION",
  "YELLOW_OPTIMISM",
  "GREEN_CREATIVITY",
  "BLUE_PROCESS",
]);

export type PerspectiveType = z.infer<typeof perspectiveEnum>;

export const perspectiveSetInput = z.object({
  commentId: z.string().min(1),
  perspective: perspectiveEnum,
});

export type PerspectiveSetInput = z.infer<typeof perspectiveSetInput>;

export const perspectiveGetInput = z.object({
  commentId: z.string().min(1),
});

export type PerspectiveGetInput = z.infer<typeof perspectiveGetInput>;

export const perspectivesByIdeaInput = z.object({
  ideaId: z.string().min(1),
  perspective: perspectiveEnum,
});

export type PerspectivesByIdeaInput = z.infer<typeof perspectivesByIdeaInput>;

export const perspectiveDistributionInput = z.object({
  ideaId: z.string().min(1),
});

export type PerspectiveDistributionInput = z.infer<typeof perspectiveDistributionInput>;

export const perspectiveRemoveInput = z.object({
  commentId: z.string().min(1),
});

export type PerspectiveRemoveInput = z.infer<typeof perspectiveRemoveInput>;
