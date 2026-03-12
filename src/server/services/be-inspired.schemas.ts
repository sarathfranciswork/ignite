import { z } from "zod";

export const beInspiredInput = z.object({
  campaignId: z.string().cuid(),
});

export const campaignSiaLinkInput = z.object({
  campaignId: z.string().cuid(),
  siaIds: z.array(z.string().cuid()).min(1, "At least one SIA is required").max(20),
});

export const campaignSiaUnlinkInput = z.object({
  campaignId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export type BeInspiredInput = z.infer<typeof beInspiredInput>;
export type CampaignSiaLinkInput = z.infer<typeof campaignSiaLinkInput>;
export type CampaignSiaUnlinkInput = z.infer<typeof campaignSiaUnlinkInput>;
