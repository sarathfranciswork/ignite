import { z } from "zod";

export const campaignSummaryInput = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
});

export type CampaignSummaryInput = z.infer<typeof campaignSummaryInput>;

export const evaluationSummaryInput = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type EvaluationSummaryInput = z.infer<typeof evaluationSummaryInput>;

export const notificationDigestInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

export type NotificationDigestInput = z.infer<typeof notificationDigestInput>;

export interface CampaignSummaryResult {
  campaignId: string;
  campaignTitle: string;
  engagementOverview: string | null;
  topThemes: string[];
  aiPowered: boolean;
}

export interface EvaluationSummaryResult {
  sessionId: string;
  sessionTitle: string;
  resultsDigest: string | null;
  aiPowered: boolean;
}

export interface NotificationDigestResult {
  digest: string | null;
  notificationCount: number;
  aiPowered: boolean;
}
