import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  exportCampaignReportInput,
  exportPlatformReportInput,
  exportIdeaListInput,
  exportEvaluationResultsInput,
} from "@/server/services/export.schemas";
import {
  exportCampaignReport,
  exportPlatformReport,
  exportIdeaList,
  exportEvaluationResults,
  ExportServiceError,
} from "@/server/services/export.service";

function handleExportError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ExportServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const exportRouter = createTRPCRouter({
  campaignReport: protectedProcedure
    .use(requirePermission(Action.REPORT_EXPORT))
    .input(exportCampaignReportInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await exportCampaignReport(input, ctx.session.user.id);
      } catch (error) {
        handleExportError(error);
      }
    }),

  platformReport: protectedProcedure
    .use(requirePermission(Action.REPORT_EXPORT))
    .input(exportPlatformReportInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await exportPlatformReport(input, ctx.session.user.id);
      } catch (error) {
        handleExportError(error);
      }
    }),

  ideaList: protectedProcedure
    .use(requirePermission(Action.REPORT_EXPORT))
    .input(exportIdeaListInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await exportIdeaList(input, ctx.session.user.id);
      } catch (error) {
        handleExportError(error);
      }
    }),

  evaluationResults: protectedProcedure
    .use(requirePermission(Action.REPORT_EXPORT))
    .input(exportEvaluationResultsInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await exportEvaluationResults(input, ctx.session.user.id);
      } catch (error) {
        handleExportError(error);
      }
    }),
});
