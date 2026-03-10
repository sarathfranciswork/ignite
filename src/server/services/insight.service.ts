/**
 * Insight Service — Story 9.4 (FR79)
 *
 * Business logic for community insights: CRUD, listing with filters,
 * trend linking, and visibility/approval workflow.
 */

import type {
  PrismaClient,
  InsightType,
  InsightScope,
  InsightVisibility,
} from "@prisma/client";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface InsightCreateData {
  title: string;
  content: string;
  insightType: InsightType;
  scope: InsightScope;
  scopeEntityId?: string;
  sourceUrl?: string;
  imageUrl?: string;
  trendIds?: string[];
  createdById: string;
  campaignId?: string;
  requiresApproval?: boolean;
}

interface InsightUpdateData {
  title?: string;
  content?: string;
  insightType?: InsightType;
  scope?: InsightScope;
  scopeEntityId?: string;
  sourceUrl?: string;
  imageUrl?: string;
}

interface InsightListFilters {
  campaignId?: string;
  trendId?: string;
  insightType?: InsightType;
  scope?: InsightScope;
  visibility?: InsightVisibility;
  search?: string;
  cursor?: string;
  limit?: number;
}

const insightInclude = {
  createdBy: {
    select: { id: true, name: true, avatarUrl: true },
  },
  campaign: {
    select: { id: true, title: true },
  },
  trendLinks: {
    include: {
      trend: { select: { id: true, title: true } },
    },
  },
} as const;

export function createInsightService(prisma: PrismaClient) {
  return {
    /**
     * List insights with filtering, search, and cursor-based pagination.
     * Returns newest-first by default.
     */
    async list(filters: InsightListFilters) {
      const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

      const where: Record<string, unknown> = {};

      if (filters.visibility) {
        where.visibility = filters.visibility;
      } else {
        where.visibility = "PUBLISHED";
      }

      if (filters.campaignId) {
        where.campaignId = filters.campaignId;
      }

      if (filters.insightType) {
        where.insightType = filters.insightType;
      }

      if (filters.scope) {
        where.scope = filters.scope;
      }

      if (filters.trendId) {
        where.trendLinks = {
          some: { trendId: filters.trendId },
        };
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { content: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const items = await prisma.insight.findMany({
        where,
        include: insightInclude,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      });

      const hasMore = items.length > limit;
      const results = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

      return {
        items: results.map(formatInsight),
        nextCursor,
        hasMore,
      };
    },

    /**
     * Get a single insight by ID with full detail.
     */
    async getById(id: string) {
      const insight = await prisma.insight.findUnique({
        where: { id },
        include: insightInclude,
      });

      if (!insight) {
        return null;
      }

      return formatInsight(insight);
    },

    /**
     * Create a new insight with optional trend linking.
     * Visibility is set based on whether approval is required.
     */
    async create(data: InsightCreateData) {
      const visibility: InsightVisibility = data.requiresApproval
        ? "PENDING_APPROVAL"
        : "PUBLISHED";

      const campaignId =
        data.scope === "CAMPAIGN"
          ? (data.scopeEntityId ?? data.campaignId)
          : data.campaignId;

      const insight = await prisma.insight.create({
        data: {
          title: data.title,
          content: data.content,
          insightType: data.insightType,
          scope: data.scope,
          scopeEntityId: data.scopeEntityId,
          visibility,
          sourceUrl: data.sourceUrl,
          imageUrl: data.imageUrl,
          createdById: data.createdById,
          campaignId,
          trendLinks: data.trendIds?.length
            ? {
                create: data.trendIds.map((trendId) => ({ trendId })),
              }
            : undefined,
        },
        include: insightInclude,
      });

      return formatInsight(insight);
    },

    /**
     * Update an existing insight. Only the author or admin can update.
     */
    async update(id: string, data: InsightUpdateData, userId: string) {
      const existing = await prisma.insight.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!existing) {
        throw new Error("Insight not found");
      }

      if (existing.createdById !== userId) {
        throw new Error("Not authorized to update this insight");
      }

      const insight = await prisma.insight.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: insightInclude,
      });

      return formatInsight(insight);
    },

    /**
     * Delete an insight (soft-delete by archiving).
     */
    async archive(id: string, userId: string) {
      const existing = await prisma.insight.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!existing) {
        throw new Error("Insight not found");
      }

      if (existing.createdById !== userId) {
        throw new Error("Not authorized to archive this insight");
      }

      await prisma.insight.update({
        where: { id },
        data: { visibility: "ARCHIVED" },
      });
    },

    /**
     * Approve a pending insight (Innovation Manager action).
     */
    async approve(id: string) {
      const insight = await prisma.insight.findUnique({
        where: { id },
        select: { visibility: true },
      });

      if (!insight) {
        throw new Error("Insight not found");
      }

      if (insight.visibility !== "PENDING_APPROVAL") {
        throw new Error("Insight is not pending approval");
      }

      return prisma.insight.update({
        where: { id },
        data: { visibility: "PUBLISHED" },
        include: insightInclude,
      });
    },

    /**
     * Link an insight to a trend.
     */
    async linkToTrend(insightId: string, trendId: string) {
      return prisma.trendInsightLink.create({
        data: { insightId, trendId },
      });
    },

    /**
     * Unlink an insight from a trend.
     */
    async unlinkFromTrend(insightId: string, trendId: string) {
      return prisma.trendInsightLink.deleteMany({
        where: { insightId, trendId },
      });
    },

    /**
     * Get insights linked to a specific trend (for trend detail pages).
     */
    async getByTrend(trendId: string, limit?: number) {
      return prisma.insight.findMany({
        where: {
          visibility: "PUBLISHED",
          trendLinks: { some: { trendId } },
        },
        include: insightInclude,
        orderBy: { createdAt: "desc" },
        take: limit ?? DEFAULT_PAGE_SIZE,
      });
    },
  };
}

/**
 * Format a raw Prisma insight result into a consistent shape.
 * Extracts the first linked trend/campaign for summary views.
 */
function formatInsight(insight: {
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
  createdBy: { id: string; name: string; avatarUrl: string | null };
  campaign: { id: string; title: string } | null;
  trendLinks: Array<{ trend: { id: string; title: string } }>;
}) {
  return {
    id: insight.id,
    title: insight.title,
    content: insight.content,
    insightType: insight.insightType,
    scope: insight.scope,
    scopeEntityId: insight.scopeEntityId,
    visibility: insight.visibility,
    sourceUrl: insight.sourceUrl,
    imageUrl: insight.imageUrl,
    createdAt: insight.createdAt,
    updatedAt: insight.updatedAt,
    author: insight.createdBy,
    linkedCampaign: insight.campaign,
    linkedTrend: insight.trendLinks[0]?.trend ?? null,
    trendLinks: insight.trendLinks.map((link) => ({
      id: link.trend.id,
      trend: link.trend,
    })),
  };
}
