import { z } from "zod";

export const campaignComparisonInput = z.object({
  campaignIds: z.array(z.string().cuid()).min(2).max(10),
});

export const successFactorInput = z.object({
  campaignIds: z.array(z.string().cuid()).min(1).optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export const organizationAnalysisInput = z.object({
  orgUnitIds: z.array(z.string().cuid()).min(1).optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export type CampaignComparisonInput = z.infer<typeof campaignComparisonInput>;
export type SuccessFactorInput = z.infer<typeof successFactorInput>;
export type OrganizationAnalysisInput = z.infer<typeof organizationAnalysisInput>;
