/**
 * Community Insights types — Story 9.4 (FR79)
 *
 * Insights are community-generated signals that feed into innovation strategy.
 * They can be scoped globally, linked to campaigns, or linked to trends.
 */

export const InsightType = {
  SIGNAL: "SIGNAL",
  OBSERVATION: "OBSERVATION",
  OPPORTUNITY: "OPPORTUNITY",
  RISK: "RISK",
} as const;

export type InsightType = (typeof InsightType)[keyof typeof InsightType];

export const InsightScope = {
  GLOBAL: "GLOBAL",
  CAMPAIGN: "CAMPAIGN",
  TREND: "TREND",
} as const;

export type InsightScope = (typeof InsightScope)[keyof typeof InsightScope];

export const InsightVisibility = {
  PUBLISHED: "PUBLISHED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  DRAFT: "DRAFT",
  ARCHIVED: "ARCHIVED",
} as const;

export type InsightVisibility =
  (typeof InsightVisibility)[keyof typeof InsightVisibility];

export interface InsightCreateInput {
  title: string;
  content: string;
  insightType: InsightType;
  scope: InsightScope;
  scopeEntityId?: string;
  sourceUrl?: string;
  imageUrl?: string;
  trendIds?: string[];
}

export interface InsightUpdateInput {
  title?: string;
  content?: string;
  insightType?: InsightType;
  scope?: InsightScope;
  scopeEntityId?: string;
  sourceUrl?: string;
  imageUrl?: string;
}

export interface InsightListParams {
  campaignId?: string;
  trendId?: string;
  insightType?: InsightType;
  scope?: InsightScope;
  visibility?: InsightVisibility;
  search?: string;
  cursor?: string;
  limit?: number;
}

export interface InsightSummary {
  id: string;
  title: string;
  content: string;
  insightType: InsightType;
  scope: InsightScope;
  scopeEntityId: string | null;
  visibility: InsightVisibility;
  sourceUrl: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  linkedTrend: {
    id: string;
    title: string;
  } | null;
  linkedCampaign: {
    id: string;
    title: string;
  } | null;
}

export interface InsightDetail extends InsightSummary {
  trendLinks: Array<{
    id: string;
    trend: {
      id: string;
      title: string;
    };
  }>;
}
