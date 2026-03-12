import { z } from "zod";

export const campaignComparisonInput = z.object({
  campaignIds: z
    .array(z.string().cuid())
    .min(2, "Select at least 2 campaigns to compare")
    .max(4, "Select at most 4 campaigns to compare"),
});

export const successFactorInput = z.object({
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export type CampaignComparisonInput = z.infer<typeof campaignComparisonInput>;
export type SuccessFactorInput = z.infer<typeof successFactorInput>;
