import { z } from "zod";

export const cockpitGetInput = z.object({
  campaignId: z.string().cuid(),
});

export const cockpitActivityInput = z.object({
  campaignId: z.string().cuid(),
  days: z.number().int().min(7).max(365).default(30),
});

export const cockpitExportInput = z.object({
  campaignId: z.string().cuid(),
});

export type CockpitGetInput = z.infer<typeof cockpitGetInput>;
export type CockpitActivityInput = z.infer<typeof cockpitActivityInput>;
export type CockpitExportInput = z.infer<typeof cockpitExportInput>;
