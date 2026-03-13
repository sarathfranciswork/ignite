import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { registerInput, registerUser, AuthServiceError } from "@/server/services/auth.service";
import { verifyCode, TotpServiceError } from "@/server/services/totp.service";

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  register: publicProcedure.input(registerInput).mutation(async ({ input }) => {
    try {
      const user = await registerUser(input);
      return user;
    } catch (error) {
      if (error instanceof AuthServiceError && error.code === "EMAIL_EXISTS") {
        throw new TRPCError({
          code: "CONFLICT",
          message: error.message,
        });
      }
      throw error;
    }
  }),

  verifyTwoFactor: protectedProcedure
    .input(z.object({ code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      try {
        const result = await verifyCode({ userId, code: input.code });
        if (!result.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid verification code" });
        }
        return { verified: true, method: result.method };
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
});
