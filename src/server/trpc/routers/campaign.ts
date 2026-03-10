import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  campaignCreateInput,
  campaignUpdateInput,
  campaignGetByIdInput,
  campaignListInput,
  campaignDeleteInput,
  campaignTransitionInput,
  createCampaign,
  getCampaignById,
  listCampaigns,
  updateCampaign,
  deleteCampaign,
  transitionCampaign,
  CampaignServiceError,
} from "@/server/services/campaign.service";

function handleCampaignError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof CampaignServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN"> = {
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      SPONSOR_NOT_FOUND: "NOT_FOUND",
      INVALID_DATES: "BAD_REQUEST",
      INVALID_TRANSITION: "BAD_REQUEST",
      GUARD_FAILED: "FORBIDDEN",
      CANNOT_DELETE_NON_DRAFT: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const campaignRouter = createTRPCRouter({
  create: protectedProcedure
    .use(requirePermission(Action.CAMPAIGN_CREATE))
    .input(campaignCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  getById: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_READ, (input) => input.id))
    .input(campaignGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getCampaignById(input.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.CAMPAIGN_READ))
    .input(campaignListInput)
    .query(async ({ input }) => {
      return listCampaigns(input);
    }),

  update: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_UPDATE, (input) => input.id))
    .input(campaignUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_DELETE, (input) => input.id))
    .input(campaignDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await deleteCampaign(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleCampaignError(error);
      }
    }),

  transition: protectedProcedure
    .use(requirePermission<{ id: string }>(Action.CAMPAIGN_TRANSITION, (input) => input.id))
    .input(campaignTransitionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await transitionCampaign(input, ctx.session.user.id);
      } catch (error) {
        handleCampaignError(error);
      }
    }),
});
