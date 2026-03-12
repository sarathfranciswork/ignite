import { z } from "zod";

export const campaignOverviewInput = z.object({
  campaignId: z.string().cuid(),
});

export const portfolioAnalysisInput = z.object({
  processDefinitionId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "TERMINATED", "ON_HOLD"]).optional(),
});

export const ideaFunnelInput = z.object({
  campaignId: z.string().cuid(),
});

export const platformSummaryInput = z.object({
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export type CampaignOverviewInput = z.infer<typeof campaignOverviewInput>;
export type PortfolioAnalysisInput = z.infer<typeof portfolioAnalysisInput>;
export type IdeaFunnelInput = z.infer<typeof ideaFunnelInput>;
export type PlatformSummaryInput = z.infer<typeof platformSummaryInput>;
