import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  useCasePipelineFunnelInput,
  organizationActivityInput,
} from "@/server/services/partnering-report.schemas";
import {
  getUseCasePipelineFunnel,
  getOrganizationActivity,
  PartneringReportServiceError,
} from "@/server/services/partnering-report.service";

function handlePartneringReportError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof PartneringReportServiceError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const partneringReportRouter = createTRPCRouter({
  useCasePipelineFunnel: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(useCasePipelineFunnelInput)
    .query(async ({ input }) => {
      try {
        return await getUseCasePipelineFunnel(input);
      } catch (error) {
        handlePartneringReportError(error);
      }
    }),

  organizationActivity: protectedProcedure
    .use(requirePermission(Action.REPORT_READ))
    .input(organizationActivityInput)
    .query(async ({ input }) => {
      try {
        return await getOrganizationActivity(input);
      } catch (error) {
        handlePartneringReportError(error);
      }
    }),
});
