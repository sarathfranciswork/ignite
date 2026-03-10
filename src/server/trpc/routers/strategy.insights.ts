/**
 * Strategy Insights tRPC Router — Story 9.4 (FR79)
 *
 * Endpoints:
 *   strategy.insights.list     — List/filter insights with cursor pagination
 *   strategy.insights.getById  — Get single insight detail
 *   strategy.insights.create   — Create new community insight
 *   strategy.insights.update   — Update own insight
 *   strategy.insights.delete   — Archive (soft-delete) own insight
 *   strategy.insights.approve  — Approve pending insight (manager only)
 *   strategy.insights.linkToTrend   — Link insight to trend
 *   strategy.insights.unlinkFromTrend — Unlink insight from trend
 *   strategy.insights.getByTrend    — Get insights for a trend detail page
 */

import { z } from "zod";

const InsightTypeEnum = z.enum([
  "SIGNAL",
  "OBSERVATION",
  "OPPORTUNITY",
  "RISK",
]);
const InsightScopeEnum = z.enum(["GLOBAL", "CAMPAIGN", "TREND"]);
const InsightVisibilityEnum = z.enum([
  "PUBLISHED",
  "PENDING_APPROVAL",
  "DRAFT",
  "ARCHIVED",
]);

// ─── Input Schemas ──────────────────────────────────────────────────────────

export const listInsightsSchema = z.object({
  campaignId: z.string().cuid().optional(),
  trendId: z.string().cuid().optional(),
  insightType: InsightTypeEnum.optional(),
  scope: InsightScopeEnum.optional(),
  visibility: InsightVisibilityEnum.optional(),
  search: z.string().max(200).optional(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export const getInsightByIdSchema = z.object({
  id: z.string().cuid(),
});

export const createInsightSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  insightType: InsightTypeEnum,
  scope: InsightScopeEnum.default("GLOBAL"),
  scopeEntityId: z.string().cuid().optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  imageUrl: z.string().url().max(2000).optional(),
  trendIds: z.array(z.string().cuid()).max(10).optional(),
});

export const updateInsightSchema = z.object({
  id: z.string().cuid(),
  data: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(10000).optional(),
    insightType: InsightTypeEnum.optional(),
    scope: InsightScopeEnum.optional(),
    scopeEntityId: z.string().cuid().optional(),
    sourceUrl: z.string().url().max(2000).optional().nullable(),
    imageUrl: z.string().url().max(2000).optional().nullable(),
  }),
});

export const deleteInsightSchema = z.object({
  id: z.string().cuid(),
});

export const approveInsightSchema = z.object({
  id: z.string().cuid(),
});

export const linkToTrendSchema = z.object({
  insightId: z.string().cuid(),
  trendId: z.string().cuid(),
});

export const unlinkFromTrendSchema = z.object({
  insightId: z.string().cuid(),
  trendId: z.string().cuid(),
});

export const getByTrendSchema = z.object({
  trendId: z.string().cuid(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ─── Route handler types ────────────────────────────────────────────────────

export type InsightListInput = z.infer<typeof listInsightsSchema>;
export type InsightGetByIdInput = z.infer<typeof getInsightByIdSchema>;
export type InsightCreateInput = z.infer<typeof createInsightSchema>;
export type InsightUpdateInput = z.infer<typeof updateInsightSchema>;
export type InsightDeleteInput = z.infer<typeof deleteInsightSchema>;
export type InsightApproveInput = z.infer<typeof approveInsightSchema>;
export type InsightLinkToTrendInput = z.infer<typeof linkToTrendSchema>;
export type InsightUnlinkFromTrendInput = z.infer<typeof unlinkFromTrendSchema>;
export type InsightGetByTrendInput = z.infer<typeof getByTrendSchema>;

// ─── Route handler factories ────────────────────────────────────────────────

/**
 * Route handler factories for the insights router.
 *
 * These are framework-agnostic handler functions that implement the business
 * logic for each endpoint. They are designed to be wired into a tRPC router
 * when the tRPC infrastructure is set up.
 *
 * Usage with tRPC:
 *   const insightsRouter = createTRPCRouter({
 *     list: protectedProcedure
 *       .input(listInsightsSchema)
 *       .query(({ input }) => insightHandlers.list(input)),
 *     create: protectedProcedure
 *       .input(createInsightSchema)
 *       .mutation(({ input, ctx }) => insightHandlers.create(input, ctx.userId)),
 *   });
 */
export function createInsightHandlers(
  insightService: ReturnType<
    typeof import("../../services/insight.service").createInsightService
  >,
) {
  return {
    async list(input: InsightListInput) {
      return insightService.list(input);
    },

    async getById(input: InsightGetByIdInput) {
      const insight = await insightService.getById(input.id);
      if (!insight) {
        throw new Error("Insight not found");
      }
      return insight;
    },

    async create(input: InsightCreateInput, userId: string) {
      return insightService.create({
        ...input,
        createdById: userId,
      });
    },

    async update(input: InsightUpdateInput, userId: string) {
      const { sourceUrl, imageUrl, ...rest } = input.data;
      return insightService.update(
        input.id,
        {
          ...rest,
          sourceUrl: sourceUrl ?? undefined,
          imageUrl: imageUrl ?? undefined,
        },
        userId,
      );
    },

    async archive(input: InsightDeleteInput, userId: string) {
      await insightService.archive(input.id, userId);
      return { success: true };
    },

    async approve(input: InsightApproveInput) {
      return insightService.approve(input.id);
    },

    async linkToTrend(input: InsightLinkToTrendInput) {
      return insightService.linkToTrend(input.insightId, input.trendId);
    },

    async unlinkFromTrend(input: InsightUnlinkFromTrendInput) {
      await insightService.unlinkFromTrend(input.insightId, input.trendId);
      return { success: true };
    },

    async getByTrend(input: InsightGetByTrendInput) {
      return insightService.getByTrend(input.trendId, input.limit);
    },
  };
}
