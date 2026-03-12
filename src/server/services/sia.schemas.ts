import { z } from "zod";

export const siaCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(10000).optional(),
  imageUrl: z.string().url().max(2048).optional(),
});

export const siaUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const siaListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});

export const siaGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const siaDeleteInput = z.object({
  id: z.string().cuid(),
});

export const siaLinkCampaignInput = z.object({
  siaId: z.string().cuid(),
  campaignId: z.string().cuid(),
});

export const siaUnlinkCampaignInput = z.object({
  siaId: z.string().cuid(),
  campaignId: z.string().cuid(),
});

export type SiaCreateInput = z.infer<typeof siaCreateInput>;
export type SiaUpdateInput = z.infer<typeof siaUpdateInput>;
export type SiaListInput = z.infer<typeof siaListInput>;
export type SiaLinkCampaignInput = z.infer<typeof siaLinkCampaignInput>;
export type SiaUnlinkCampaignInput = z.infer<typeof siaUnlinkCampaignInput>;
