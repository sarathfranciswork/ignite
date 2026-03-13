import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  generateSecret,
  verifyAndEnable,
  verifyCode,
  disableTwoFactor,
  regenerateBackupCodes,
  getTwoFactorStatus,
  TotpServiceError,
} from "@/server/services/totp.service";
import {
  listUserSessions,
  terminateSession,
  terminateAllOtherSessions,
  adminTerminateSession,
  SessionManagementError,
} from "@/server/services/session-management.service";

export const securityRouter = createTRPCRouter({
  twoFactorSetup: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_SETUP))
    .mutation(async ({ ctx }) => {
      try {
        return await generateSecret({ userId: ctx.session.user.id });
      } catch (error) {
        if (error instanceof TotpServiceError) {
          if (error.code === "ALREADY_ENABLED") {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          if (error.code === "ENCRYPTION_KEY_MISSING" || error.code === "ENCRYPTION_KEY_INVALID") {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "2FA configuration error",
            });
          }
        }
        throw error;
      }
    }),

  twoFactorVerify: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_SETUP))
    .input(z.object({ totpCode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await verifyAndEnable({ userId: ctx.session.user.id, totpCode: input.totpCode });
      } catch (error) {
        if (error instanceof TotpServiceError) {
          if (error.code === "SETUP_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: error.message });
          }
          if (error.code === "ALREADY_ENABLED") {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          if (error.code === "INVALID_CODE") {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
        }
        throw error;
      }
    }),

  twoFactorDisable: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_DISABLE))
    .input(z.object({ totpCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await verifyCode({ userId: ctx.session.user.id, code: input.totpCode });
        if (!result.verified) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code" });
        }
        await disableTwoFactor({ userId: ctx.session.user.id });
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (error instanceof TotpServiceError) {
          if (error.code === "NOT_ENABLED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
        }
        throw error;
      }
    }),

  twoFactorRegenerateBackupCodes: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_SETUP))
    .input(z.object({ totpCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await verifyCode({ userId: ctx.session.user.id, code: input.totpCode });
        if (!result.verified) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code" });
        }
        return await regenerateBackupCodes({ userId: ctx.session.user.id });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (error instanceof TotpServiceError) {
          if (error.code === "NOT_ENABLED") {
            throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
          }
        }
        throw error;
      }
    }),

  twoFactorStatus: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_SETUP))
    .query(async ({ ctx }) => {
      return await getTwoFactorStatus({ userId: ctx.session.user.id });
    }),

  sessionList: protectedProcedure
    .use(requirePermission(Action.SESSION_LIST_OWN))
    .query(async ({ ctx }) => {
      return await listUserSessions({ userId: ctx.session.user.id });
    }),

  sessionTerminate: protectedProcedure
    .use(requirePermission(Action.SESSION_TERMINATE_OWN))
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await terminateSession({
          sessionId: input.sessionId,
          userId: ctx.session.user.id,
        });
        return { success: true };
      } catch (error) {
        if (error instanceof SessionManagementError && error.code === "SESSION_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw error;
      }
    }),

  sessionTerminateAll: protectedProcedure
    .use(requirePermission(Action.SESSION_TERMINATE_OWN))
    .input(z.object({ currentSessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return await terminateAllOtherSessions({
        userId: ctx.session.user.id,
        currentSessionId: input.currentSessionId,
      });
    }),

  adminSessionTerminate: protectedProcedure
    .use(requirePermission(Action.SESSION_TERMINATE_ANY))
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await adminTerminateSession({
          sessionId: input.sessionId,
          adminUserId: ctx.session.user.id,
        });
        return { success: true };
      } catch (error) {
        if (error instanceof SessionManagementError && error.code === "SESSION_NOT_FOUND") {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw error;
      }
    }),
});
