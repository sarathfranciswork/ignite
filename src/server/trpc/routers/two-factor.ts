import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import {
  generateSecret,
  verifyAndEnable,
  disableTwoFactor,
  regenerateBackupCodes,
  getTwoFactorStatus,
  verifyCode,
  TotpServiceError,
} from "@/server/services/totp.service";
import {
  listUserSessions,
  terminateSession,
  terminateAllOtherSessions,
  SessionManagementError,
} from "@/server/services/session-management.service";
import { Action } from "@/server/lib/permissions";

function handleTotpError(error: unknown): never {
  if (error instanceof TotpServiceError) {
    if (error.code === "USER_NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    if (error.code === "INVALID_CODE") {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    if (
      error.code === "ALREADY_ENABLED" ||
      error.code === "NOT_ENABLED" ||
      error.code === "NOT_SETUP"
    ) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  }
  throw error;
}

function handleSessionError(error: unknown): never {
  if (error instanceof SessionManagementError) {
    if (error.code === "SESSION_NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: error.message });
    }
    if (error.code === "UNAUTHORIZED") {
      throw new TRPCError({ code: "FORBIDDEN", message: error.message });
    }
    if (error.code === "CANNOT_TERMINATE_CURRENT") {
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
  }
  throw error;
}

export const twoFactorRouter = createTRPCRouter({
  getStatus: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_MANAGE))
    .query(async ({ ctx }) => {
      return getTwoFactorStatus(ctx.session.user.id);
    }),

  setup: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_MANAGE))
    .mutation(async ({ ctx }) => {
      try {
        return await generateSecret({ userId: ctx.session.user.id });
      } catch (error) {
        handleTotpError(error);
      }
    }),

  verify: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_MANAGE))
    .input(z.object({ totpCode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await verifyAndEnable({ userId: ctx.session.user.id, totpCode: input.totpCode });
      } catch (error) {
        handleTotpError(error);
      }
    }),

  disable: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_MANAGE))
    .input(z.object({ totpCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await verifyCode({ userId: ctx.session.user.id, code: input.totpCode });
        if (!result.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code" });
        }
        return await disableTwoFactor({ userId: ctx.session.user.id });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        handleTotpError(error);
      }
    }),

  regenerateBackupCodes: protectedProcedure
    .use(requirePermission(Action.TWO_FACTOR_MANAGE))
    .input(z.object({ totpCode: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await verifyCode({ userId: ctx.session.user.id, code: input.totpCode });
        if (!result.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code" });
        }
        return await regenerateBackupCodes({ userId: ctx.session.user.id });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        handleTotpError(error);
      }
    }),

  // Session management
  sessionList: protectedProcedure
    .use(requirePermission(Action.SESSION_READ_OWN))
    .query(async ({ ctx }) => {
      return listUserSessions({ userId: ctx.session.user.id });
    }),

  sessionTerminate: protectedProcedure
    .use(requirePermission(Action.SESSION_TERMINATE_OWN))
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await terminateSession({
          sessionId: input.sessionId,
          userId: ctx.session.user.id,
        });
      } catch (error) {
        handleSessionError(error);
      }
    }),

  sessionTerminateAll: protectedProcedure
    .use(requirePermission(Action.SESSION_TERMINATE_OWN))
    .input(z.object({ currentSessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return terminateAllOtherSessions({
        userId: ctx.session.user.id,
        currentSessionId: input.currentSessionId,
      });
    }),
});
