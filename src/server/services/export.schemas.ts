import { z } from "zod";

export const exportCampaignReportInput = z.object({
  campaignId: z.string().cuid(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  includeKpiTimeSeries: z.boolean().default(true),
  includeIdeaList: z.boolean().default(true),
  includeEvaluationResults: z.boolean().default(false),
});

export const exportPlatformReportInput = z.object({
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  campaignIds: z.array(z.string().cuid()).optional(),
});

export const exportIdeaListInput = z.object({
  campaignId: z.string().cuid(),
  statuses: z
    .array(
      z.enum([
        "DRAFT",
        "QUALIFICATION",
        "COMMUNITY_DISCUSSION",
        "HOT",
        "EVALUATION",
        "SELECTED_IMPLEMENTATION",
        "IMPLEMENTED",
        "ARCHIVED",
      ]),
    )
    .optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
});

export const exportEvaluationResultsInput = z.object({
  campaignId: z.string().cuid(),
  evaluationSessionId: z.string().cuid().optional(),
});

export const exportPartneringReportInput = z.object({
  organizationIds: z.array(z.string().cuid()).optional(),
  relationshipStatus: z
    .enum(["IDENTIFIED", "VERIFIED", "QUALIFIED", "EVALUATION", "PILOT", "PARTNERSHIP", "ARCHIVED"])
    .optional(),
  dateRange: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
  includeUseCasePipeline: z.boolean().default(true),
});

export type ExportCampaignReportInput = z.infer<typeof exportCampaignReportInput>;
export type ExportPlatformReportInput = z.infer<typeof exportPlatformReportInput>;
export type ExportIdeaListInput = z.infer<typeof exportIdeaListInput>;
export type ExportEvaluationResultsInput = z.infer<typeof exportEvaluationResultsInput>;
export type ExportPartneringReportInput = z.infer<typeof exportPartneringReportInput>;
