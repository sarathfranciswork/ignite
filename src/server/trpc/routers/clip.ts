import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { clipCreateInput, clipListInput } from "@/server/services/clip.schemas";
import { createClip, listClips, ClipServiceError } from "@/server/services/clip.service";

function handleClipError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof ClipServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      INVALID_URL: "BAD_REQUEST",
      CAMPAIGN_REQUIRED: "BAD_REQUEST",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const clipRouter = createTRPCRouter({
  create: protectedProcedure.input(clipCreateInput).mutation(async ({ ctx, input }) => {
    try {
      return await createClip(input, ctx.session.user.id);
    } catch (error) {
      handleClipError(error);
    }
  }),

  list: protectedProcedure.input(clipListInput).query(async ({ ctx, input }) => {
    return listClips(input, ctx.session.user.id);
  }),
});
