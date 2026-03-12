import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  trendListInput,
  trendCreateInput,
  trendUpdateInput,
  trendGetByIdInput,
  trendDeleteInput,
  trendArchiveInput,
  trendLinkSiaInput,
  trendUnlinkSiaInput,
} from "@/server/services/trend.schemas";
import {
  listTrends,
  getTrendById,
  createTrend,
  updateTrend,
  archiveTrend,
  deleteTrend,
  linkTrendToSia,
  unlinkTrendFromSia,
  TrendServiceError,
} from "@/server/services/trend.service";

function handleTrendError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof TrendServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      TREND_NOT_FOUND: "NOT_FOUND",
      PARENT_NOT_FOUND: "NOT_FOUND",
      SIA_NOT_FOUND: "NOT_FOUND",
      INVALID_HIERARCHY: "BAD_REQUEST",
      INVALID_PARENT: "BAD_REQUEST",
      HAS_CHILDREN: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const trendRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.TREND_READ))
    .input(trendListInput)
    .query(async ({ input }) => {
      return listTrends(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.TREND_READ))
    .input(trendGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getTrendById(input.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.TREND_CREATE))
    .input(trendCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createTrend(input, ctx.session.user.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.TREND_UPDATE))
    .input(trendUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateTrend(input, ctx.session.user.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.TREND_UPDATE))
    .input(trendArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveTrend(input.id, ctx.session.user.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.TREND_DELETE))
    .input(trendDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteTrend(input.id, ctx.session.user.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),

  linkToSia: protectedProcedure
    .use(requirePermission(Action.TREND_UPDATE))
    .input(trendLinkSiaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkTrendToSia(input, ctx.session.user.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),

  unlinkSia: protectedProcedure
    .use(requirePermission(Action.TREND_UPDATE))
    .input(trendUnlinkSiaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkTrendFromSia(input, ctx.session.user.id);
      } catch (error) {
        handleTrendError(error);
      }
    }),
});
