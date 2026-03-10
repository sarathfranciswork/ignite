import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { CampaignSiaService } from "@/server/services/campaign-sia.service";
import {
  linkCampaignToSiasSchema,
  unlinkCampaignSiaSchema,
  getBeInspiredSchema,
  getRelatedTrendsSchema,
  linkIdeaToTrendSchema,
  unlinkIdeaTrendSchema,
  getCampaignSiasSchema,
} from "@/types/campaign-sia";

/**
 * Campaign-SIA Router (Story 9.6)
 *
 * Handles campaign-SIA linking, "Be Inspired" tab data,
 * and idea-trend linking from the submission sidebar.
 */
export const campaignSiaRouter = router({
  /** Link a campaign to one or more SIAs */
  linkToSias: protectedProcedure
    .input(linkCampaignToSiasSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      try {
        return await service.linkCampaignToSias(input.campaignId, input.siaIds);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Failed to link SIAs",
        });
      }
    }),

  /** Unlink a single SIA from a campaign */
  unlinkSia: protectedProcedure
    .input(unlinkCampaignSiaSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      try {
        await service.unlinkCampaignSia(input.campaignId, input.siaId);
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign-SIA link not found",
        });
      }
    }),

  /** Get SIAs linked to a campaign */
  getCampaignSias: protectedProcedure
    .input(getCampaignSiasSchema)
    .query(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      return service.getCampaignSias(input.campaignId);
    }),

  /** Get "Be Inspired" tab content for a campaign */
  getBeInspiredContent: protectedProcedure
    .input(getBeInspiredSchema)
    .query(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      return service.getBeInspiredContent(input.campaignId);
    }),

  /** Check if campaign has SIA links (for conditional tab display) */
  hasSiaLinks: protectedProcedure
    .input(getBeInspiredSchema)
    .query(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      return service.hasSiaLinks(input.campaignId);
    }),

  /** Get related trends for idea submission sidebar */
  getRelatedTrends: protectedProcedure
    .input(getRelatedTrendsSchema)
    .query(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      return service.getRelatedTrendsForCampaign(input.campaignId);
    }),

  /** Link an idea to a trend (one-click from submission sidebar) */
  linkIdeaToTrend: protectedProcedure
    .input(linkIdeaToTrendSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      try {
        await service.linkIdeaToTrend(input.ideaId, input.trendId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to link idea to trend",
        });
      }
    }),

  /** Unlink an idea from a trend */
  unlinkIdeaTrend: protectedProcedure
    .input(unlinkIdeaTrendSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new CampaignSiaService(ctx.db);
      try {
        await service.unlinkIdeaTrend(input.ideaId, input.trendId);
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Idea-trend link not found",
        });
      }
    }),
});

export type CampaignSiaRouter = typeof campaignSiaRouter;
