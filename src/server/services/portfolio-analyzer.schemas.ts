import { z } from "zod";

export const portfolioOverviewInput = z.object({
  processDefinitionId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "TERMINATED"]).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const processAnalysisInput = z.object({
  processDefinitionId: z.string().cuid(),
});

export const portfolioMatrixInput = z.object({
  processDefinitionId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "TERMINATED"]).optional(),
});

export type PortfolioOverviewInput = z.infer<typeof portfolioOverviewInput>;
export type ProcessAnalysisInput = z.infer<typeof processAnalysisInput>;
export type PortfolioMatrixInput = z.infer<typeof portfolioMatrixInput>;
