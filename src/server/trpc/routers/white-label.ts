import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import { whiteLabelUpdateInput } from "@/server/services/white-label.schemas";
import {
  getWhiteLabelConfig,
  getPublicWhiteLabelConfig,
  updateWhiteLabelConfig,
  resetWhiteLabelConfig,
  WhiteLabelServiceError,
} from "@/server/services/white-label.service";

function handleWhiteLabelError(error: unknown): never {
  if (error instanceof WhiteLabelServiceError) {
    const codeMap: Record<string, "BAD_REQUEST" | "CONFLICT"> = {
      DOMAIN_CONFLICT: "CONFLICT",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const whiteLabelRouter = createTRPCRouter({
  getPublic: publicProcedure.query(async () => {
    return getPublicWhiteLabelConfig();
  }),

  get: protectedProcedure.use(requirePermission(Action.WHITE_LABEL_READ)).query(async () => {
    return getWhiteLabelConfig();
  }),

  update: protectedProcedure
    .use(requirePermission(Action.WHITE_LABEL_UPDATE))
    .input(whiteLabelUpdateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateWhiteLabelConfig(input, ctx.session.user.id);
      } catch (error) {
        handleWhiteLabelError(error);
      }
    }),

  reset: protectedProcedure
    .use(requirePermission(Action.WHITE_LABEL_UPDATE))
    .mutation(async ({ ctx }) => {
      return resetWhiteLabelConfig(ctx.session.user.id);
    }),
});
