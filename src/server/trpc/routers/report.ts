import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  campaignOverviewInput,
  portfolioAnalysisInput,
  ideaFunnelInput,
  platformSummaryInput,
} from "@/server/services/report.schemas";
import {
  getCampaignOverview,
  getPortfolioAnalysis,
  getIdeaFunnel,
  getPlatformSummary,
  ReportServiceError,
} from "@/server/services/report.service";

function handleReportError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ReportServiceError) {
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

export const reportRouter = createTRPCRouter({
  campaignOverview: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(campaignOverviewInput)
    .query(async ({ input }) => {
      try {
        return await getCampaignOverview(input);
      } catch (error) {
        handleReportError(error);
      }
    }),

  portfolioAnalysis: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(portfolioAnalysisInput)
    .query(async ({ input }) => {
      try {
        return await getPortfolioAnalysis(input);
      } catch (error) {
        handleReportError(error);
      }
    }),

  ideaFunnel: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(ideaFunnelInput)
    .query(async ({ input }) => {
      try {
        return await getIdeaFunnel(input);
      } catch (error) {
        handleReportError(error);
      }
    }),

  platformSummary: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(platformSummaryInput)
    .query(async ({ input }) => {
      try {
        return await getPlatformSummary(input);
      } catch (error) {
        handleReportError(error);
      }
    }),
});
