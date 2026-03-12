import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  siaListInput,
  siaCreateInput,
  siaUpdateInput,
  siaGetByIdInput,
  siaDeleteInput,
  siaLinkCampaignInput,
  siaUnlinkCampaignInput,
} from "@/server/services/sia.schemas";
import {
  listSias,
  getSiaById,
  createSia,
  updateSia,
  deleteSia,
  linkCampaignToSia,
  unlinkCampaignFromSia,
  SiaServiceError,
} from "@/server/services/sia.service";

function handleSiaError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof SiaServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      SIA_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const siaRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.SIA_READ))
    .input(siaListInput)
    .query(async ({ input }) => {
      return listSias(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.SIA_READ))
    .input(siaGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getSiaById(input.id);
      } catch (error) {
        handleSiaError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.SIA_CREATE))
    .input(siaCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createSia(input, ctx.session.user.id);
      } catch (error) {
        handleSiaError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.SIA_UPDATE))
    .input(siaUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateSia(input, ctx.session.user.id);
      } catch (error) {
        handleSiaError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.SIA_DELETE))
    .input(siaDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteSia(input.id, ctx.session.user.id);
      } catch (error) {
        handleSiaError(error);
      }
    }),

  linkCampaign: protectedProcedure
    .use(requirePermission(Action.SIA_UPDATE))
    .input(siaLinkCampaignInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkCampaignToSia(input, ctx.session.user.id);
      } catch (error) {
        handleSiaError(error);
      }
    }),

  unlinkCampaign: protectedProcedure
    .use(requirePermission(Action.SIA_UPDATE))
    .input(siaUnlinkCampaignInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkCampaignFromSia(input, ctx.session.user.id);
      } catch (error) {
        handleSiaError(error);
      }
    }),
});
