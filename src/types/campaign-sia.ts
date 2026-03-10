import { z } from "zod";

// ============================================================
// Zod Schemas for Campaign-SIA Linking (Story 9.6)
// ============================================================

/** Link a campaign to one or more SIAs */
export const linkCampaignToSiasSchema = z.object({
  campaignId: z.string().cuid(),
  siaIds: z
    .array(z.string().cuid())
    .min(1, "At least one SIA must be selected"),
});

/** Unlink a single SIA from a campaign */
export const unlinkCampaignSiaSchema = z.object({
  campaignId: z.string().cuid(),
  siaId: z.string().cuid(),
});

/** Get "Be Inspired" content for a campaign */
export const getBeInspiredSchema = z.object({
  campaignId: z.string().cuid(),
});

/** Get related trends for idea submission sidebar */
export const getRelatedTrendsSchema = z.object({
  campaignId: z.string().cuid(),
});

/** Link an idea to a trend (one-click from submission sidebar) */
export const linkIdeaToTrendSchema = z.object({
  ideaId: z.string().cuid(),
  trendId: z.string().cuid(),
});

/** Unlink an idea from a trend */
export const unlinkIdeaTrendSchema = z.object({
  ideaId: z.string().cuid(),
  trendId: z.string().cuid(),
});

/** Get SIAs linked to a campaign */
export const getCampaignSiasSchema = z.object({
  campaignId: z.string().cuid(),
});

// ============================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================

export type LinkCampaignToSiasInput = z.infer<typeof linkCampaignToSiasSchema>;
export type UnlinkCampaignSiaInput = z.infer<typeof unlinkCampaignSiaSchema>;
export type GetBeInspiredInput = z.infer<typeof getBeInspiredSchema>;
export type GetRelatedTrendsInput = z.infer<typeof getRelatedTrendsSchema>;
export type LinkIdeaToTrendInput = z.infer<typeof linkIdeaToTrendSchema>;
export type UnlinkIdeaTrendInput = z.infer<typeof unlinkIdeaTrendSchema>;
export type GetCampaignSiasInput = z.infer<typeof getCampaignSiasSchema>;

// ============================================================
// Response Types for "Be Inspired" tab
// ============================================================

export interface SiaSummary {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

export interface TrendCard {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: "MEGA" | "MACRO" | "MICRO";
  businessRelevance: number | null;
  siaName: string;
}

export interface TechnologyCard {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  maturityLevel: string | null;
  siaName: string;
}

export interface InsightCard {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  trendTitle: string;
}

export interface BeInspiredContent {
  sias: SiaSummary[];
  trends: TrendCard[];
  technologies: TechnologyCard[];
  insights: InsightCard[];
  hasSiaLinks: boolean;
}
