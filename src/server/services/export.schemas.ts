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

export const customKpiReportInput = z.object({
  campaignIds: z.array(z.string().cuid()).min(1).max(20),
  dateRange: z
    .object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    })
    .optional(),
  orgUnitId: z.string().cuid().optional(),
  metrics: z
    .array(
      z.enum([
        "ideas_submitted",
        "ideas_qualified",
        "ideas_hot",
        "total_comments",
        "total_votes",
        "total_likes",
        "unique_visitors",
        "total_participants",
        "member_count",
      ]),
    )
    .min(1),
  groupBy: z.enum(["campaign", "date", "org_unit"]).default("campaign"),
  format: z.enum(["json", "excel"]).default("json"),
});

export type ExportCampaignReportInput = z.infer<typeof exportCampaignReportInput>;
export type ExportPlatformReportInput = z.infer<typeof exportPlatformReportInput>;
export type ExportIdeaListInput = z.infer<typeof exportIdeaListInput>;
export type ExportEvaluationResultsInput = z.infer<typeof exportEvaluationResultsInput>;
export type CustomKpiReportInput = z.infer<typeof customKpiReportInput>;
