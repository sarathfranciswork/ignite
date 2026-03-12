import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  insightListInput,
  insightCreateInput,
  insightUpdateInput,
  insightGetByIdInput,
  insightDeleteInput,
  insightArchiveInput,
  insightLinkTrendInput,
  insightUnlinkTrendInput,
} from "@/server/services/insight.schemas";
import {
  listInsights,
  getInsightById,
  createInsight,
  updateInsight,
  archiveInsight,
  deleteInsight,
  linkInsightToTrend,
  unlinkInsightFromTrend,
  InsightServiceError,
} from "@/server/services/insight.service";

function handleInsightError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof InsightServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      INSIGHT_NOT_FOUND: "NOT_FOUND",
      TREND_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const insightRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.INSIGHT_READ))
    .input(insightListInput)
    .query(async ({ input }) => {
      return listInsights(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.INSIGHT_READ))
    .input(insightGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getInsightById(input.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),

  create: protectedProcedure
    .use(requirePermission(Action.INSIGHT_CREATE))
    .input(insightCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await createInsight(input, ctx.session.user.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),

  update: protectedProcedure
    .use(requirePermission(Action.INSIGHT_UPDATE))
    .input(insightUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateInsight(input, ctx.session.user.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),

  archive: protectedProcedure
    .use(requirePermission(Action.INSIGHT_UPDATE))
    .input(insightArchiveInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await archiveInsight(input.id, ctx.session.user.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),

  delete: protectedProcedure
    .use(requirePermission(Action.INSIGHT_DELETE))
    .input(insightDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteInsight(input.id, ctx.session.user.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),

  linkToTrend: protectedProcedure
    .use(requirePermission(Action.INSIGHT_UPDATE))
    .input(insightLinkTrendInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkInsightToTrend(input, ctx.session.user.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),

  unlinkTrend: protectedProcedure
    .use(requirePermission(Action.INSIGHT_UPDATE))
    .input(insightUnlinkTrendInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await unlinkInsightFromTrend(input, ctx.session.user.id);
      } catch (error) {
        handleInsightError(error);
      }
    }),
});
