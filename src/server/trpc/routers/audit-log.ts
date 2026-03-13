import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  auditLogListInput,
  auditLogGetByIdInput,
  auditLogExportInput,
  auditLogRetentionInput,
} from "@/server/services/audit-log.schemas";
import {
  listAuditLogs,
  getAuditLogById,
  exportAuditLogs,
  getAuditLogStats,
  getDistinctActions,
  getDistinctEntities,
  purgeOldAuditLogs,
  AuditLogServiceError,
} from "@/server/services/audit-log.service";

function handleAuditLogError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof AuditLogServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      ENTRY_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const auditLogRouter = createTRPCRouter({
  list: protectedProcedure
    .use(requirePermission(Action.AUDIT_LOG_READ))
    .input(auditLogListInput)
    .query(async ({ input }) => {
      return listAuditLogs(input);
    }),

  getById: protectedProcedure
    .use(requirePermission(Action.AUDIT_LOG_READ))
    .input(auditLogGetByIdInput)
    .query(async ({ input }) => {
      try {
        return await getAuditLogById(input.id);
      } catch (error) {
        handleAuditLogError(error);
      }
    }),

  export: protectedProcedure
    .use(requirePermission(Action.AUDIT_LOG_EXPORT))
    .input(auditLogExportInput)
    .mutation(async ({ input }) => {
      return exportAuditLogs(input);
    }),

  stats: protectedProcedure.use(requirePermission(Action.AUDIT_LOG_READ)).query(async () => {
    return getAuditLogStats();
  }),

  distinctActions: protectedProcedure
    .use(requirePermission(Action.AUDIT_LOG_READ))
    .query(async () => {
      return getDistinctActions();
    }),

  distinctEntities: protectedProcedure
    .use(requirePermission(Action.AUDIT_LOG_READ))
    .query(async () => {
      return getDistinctEntities();
    }),

  purge: protectedProcedure
    .use(requirePermission(Action.AUDIT_LOG_CONFIGURE))
    .input(auditLogRetentionInput)
    .mutation(async ({ input }) => {
      return purgeOldAuditLogs(input);
    }),
});
