import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  campaignComparisonInput,
  successFactorInput,
  organizationAnalysisInput,
} from "@/server/services/campaign-comparison.schemas";
import {
  compareCampaigns,
  getSuccessFactors,
  getOrganizationAnalysis,
  CampaignComparisonServiceError,
} from "@/server/services/campaign-comparison.service";

function handleCampaignComparisonError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof CampaignComparisonServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      INSUFFICIENT_CAMPAIGNS: "BAD_REQUEST",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const campaignComparisonRouter = createTRPCRouter({
  compare: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(campaignComparisonInput)
    .query(async ({ input }) => {
      try {
        return await compareCampaigns(input);
      } catch (error) {
        handleCampaignComparisonError(error);
      }
    }),

  successFactors: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(successFactorInput)
    .query(async ({ input }) => {
      try {
        return await getSuccessFactors(input);
      } catch (error) {
        handleCampaignComparisonError(error);
      }
    }),

  organizationAnalysis: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(organizationAnalysisInput)
    .query(async ({ input }) => {
      try {
        return await getOrganizationAnalysis(input);
      } catch (error) {
        handleCampaignComparisonError(error);
      }
    }),
});
