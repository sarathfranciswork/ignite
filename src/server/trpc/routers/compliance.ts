import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  gdprRequestExportInput,
  gdprRequestErasureInput,
  gdprGetStatusInput,
  gdprListRequestsInput,
  configureResidencyInput,
  getResidencyConfigInput,
  ipWhitelistAddInput,
  ipWhitelistRemoveInput,
  ipWhitelistListInput,
  ipWhitelistToggleInput,
  ipCheckInput,
} from "@/server/services/compliance.schemas";
import {
  requestDataExport,
  requestDataErasure,
  processGdprRequest,
  getRequestStatus,
  listRequests,
  GdprServiceError,
} from "@/server/services/gdpr.service";
import {
  configureResidency,
  getResidencyConfig,
  getDataLocationReport,
  DataResidencyServiceError,
} from "@/server/services/data-residency.service";
import {
  addIpRange,
  removeIpRange,
  listIpRanges,
  toggleIpRange,
  checkIp,
  IpWhitelistServiceError,
} from "@/server/services/ip-whitelist.service";
import { z } from "zod";

function handleComplianceError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (
    error instanceof GdprServiceError ||
    error instanceof DataResidencyServiceError ||
    error instanceof IpWhitelistServiceError
  ) {
    const codeMap: Record<
      string,
      "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR"
    > = {
      NOT_FOUND: "NOT_FOUND",
      USER_NOT_FOUND: "NOT_FOUND",
      REQUEST_IN_PROGRESS: "BAD_REQUEST",
      INVALID_STATE: "BAD_REQUEST",
      INVALID_CIDR: "BAD_REQUEST",
      DUPLICATE_RANGE: "BAD_REQUEST",
      FORBIDDEN: "FORBIDDEN",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
  });
}

const gdprRouter = createTRPCRouter({
  requestExport: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_GDPR_REQUEST))
    .input(gdprRequestExportInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await requestDataExport(input, ctx.session.user.id);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  requestErasure: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_GDPR_MANAGE))
    .input(gdprRequestErasureInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await requestDataErasure(input, ctx.session.user.id);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  process: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_GDPR_MANAGE))
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await processGdprRequest(input.requestId);
        return { success: true };
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  getStatus: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_GDPR_LIST))
    .input(gdprGetStatusInput)
    .query(async ({ input, ctx }) => {
      try {
        return await getRequestStatus(input, ctx.session.user.id);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  listRequests: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_GDPR_LIST))
    .input(gdprListRequestsInput)
    .query(async ({ input }) => {
      try {
        return await listRequests(input);
      } catch (error) {
        handleComplianceError(error);
      }
    }),
});

const residencyRouter = createTRPCRouter({
  configure: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_RESIDENCY_CONFIGURE))
    .input(configureResidencyInput)
    .mutation(async ({ input }) => {
      try {
        return await configureResidency(input);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  get: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_RESIDENCY_READ))
    .input(getResidencyConfigInput)
    .query(async ({ input }) => {
      try {
        return await getResidencyConfig(input);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  report: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_RESIDENCY_READ))
    .input(z.object({ spaceId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getDataLocationReport(input.spaceId);
      } catch (error) {
        handleComplianceError(error);
      }
    }),
});

const ipWhitelistRouter = createTRPCRouter({
  add: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_IP_WHITELIST_CREATE))
    .input(ipWhitelistAddInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await addIpRange(input, ctx.session.user.id);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  remove: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_IP_WHITELIST_DELETE))
    .input(ipWhitelistRemoveInput)
    .mutation(async ({ input, ctx }) => {
      try {
        await removeIpRange(input.id, ctx.session.user.id);
        return { success: true };
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  list: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_IP_WHITELIST_READ))
    .input(ipWhitelistListInput)
    .query(async ({ input }) => {
      try {
        return await listIpRanges(input);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  toggle: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_IP_WHITELIST_CREATE))
    .input(ipWhitelistToggleInput)
    .mutation(async ({ input, ctx }) => {
      try {
        return await toggleIpRange(input, ctx.session.user.id);
      } catch (error) {
        handleComplianceError(error);
      }
    }),

  check: protectedProcedure
    .use(requirePermission(Action.COMPLIANCE_IP_WHITELIST_READ))
    .input(ipCheckInput)
    .query(async ({ input }) => {
      try {
        const allowed = await checkIp(input.spaceId, input.ip);
        return { allowed };
      } catch (error) {
        handleComplianceError(error);
      }
    }),
});

export const complianceRouter = createTRPCRouter({
  gdpr: gdprRouter,
  residency: residencyRouter,
  ipWhitelist: ipWhitelistRouter,
});
