import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  portfolioOverviewInput,
  processAnalysisInput,
  portfolioMatrixInput,
} from "@/server/services/portfolio-analyzer.schemas";
import {
  getPortfolioOverview,
  getProcessAnalysis,
  getPortfolioMatrix,
  PortfolioAnalyzerError,
} from "@/server/services/portfolio-analyzer.service";

function handleAnalyzerError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof PortfolioAnalyzerError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      PROCESS_DEFINITION_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const portfolioAnalyzerRouter = createTRPCRouter({
  overview: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(portfolioOverviewInput)
    .query(async ({ input }) => {
      try {
        return await getPortfolioOverview(input);
      } catch (error) {
        handleAnalyzerError(error);
      }
    }),

  processAnalysis: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(processAnalysisInput)
    .query(async ({ input }) => {
      try {
        return await getProcessAnalysis(input);
      } catch (error) {
        handleAnalyzerError(error);
      }
    }),

  matrix: protectedProcedure
    .use(requirePermission(Action.PROJECT_READ))
    .input(portfolioMatrixInput)
    .query(async ({ input }) => {
      try {
        return await getPortfolioMatrix(input);
      } catch (error) {
        handleAnalyzerError(error);
      }
    }),
});
