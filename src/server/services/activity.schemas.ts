import { z } from "zod";

export const activityListInput = z.object({
  ideaId: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type ActivityListInput = z.infer<typeof activityListInput>;

export const activityListByCampaignInput = z.object({
  campaignId: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export type ActivityListByCampaignInput = z.infer<typeof activityListByCampaignInput>;
