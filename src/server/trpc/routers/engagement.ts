import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  likeToggleInput,
  likeStatusInput,
  voteUpsertInput,
  voteDeleteInput,
  voteGetInput,
  followToggleInput,
  followStatusInput,
  toggleLike,
  getLikeStatus,
  upsertVote,
  deleteVote,
  getIdeaVotes,
  toggleFollow,
  getFollowStatus,
  EngagementServiceError,
} from "@/server/services/engagement.service";

function handleEngagementError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof EngagementServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST" | "FORBIDDEN"> = {
      IDEA_NOT_FOUND: "NOT_FOUND",
      LIKES_DISABLED: "BAD_REQUEST",
      VOTING_DISABLED: "BAD_REQUEST",
      INVALID_CRITERION: "BAD_REQUEST",
      VOTE_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const engagementRouter = createTRPCRouter({
  // ── Likes ───────────────────────────────────────────────

  toggleLike: protectedProcedure
    .use(requirePermission(Action.IDEA_LIKE))
    .input(likeToggleInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleLike(input, ctx.session.user.id);
      } catch (error) {
        handleEngagementError(error);
      }
    }),

  getLikeStatus: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(likeStatusInput)
    .query(async ({ ctx, input }) => {
      return getLikeStatus(input.ideaId, ctx.session.user.id);
    }),

  // ── Votes ───────────────────────────────────────────────

  upsertVote: protectedProcedure
    .use(requirePermission(Action.IDEA_VOTE))
    .input(voteUpsertInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await upsertVote(input, ctx.session.user.id);
      } catch (error) {
        handleEngagementError(error);
      }
    }),

  deleteVote: protectedProcedure
    .use(requirePermission(Action.IDEA_VOTE))
    .input(voteDeleteInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteVote(input, ctx.session.user.id);
      } catch (error) {
        handleEngagementError(error);
      }
    }),

  getIdeaVotes: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(voteGetInput)
    .query(async ({ ctx, input }) => {
      try {
        return await getIdeaVotes(input, ctx.session.user.id);
      } catch (error) {
        handleEngagementError(error);
      }
    }),

  // ── Follows ─────────────────────────────────────────────

  toggleFollow: protectedProcedure
    .use(requirePermission(Action.IDEA_FOLLOW))
    .input(followToggleInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await toggleFollow(input, ctx.session.user.id);
      } catch (error) {
        handleEngagementError(error);
      }
    }),

  getFollowStatus: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(followStatusInput)
    .query(async ({ ctx, input }) => {
      return getFollowStatus(input.ideaId, ctx.session.user.id);
    }),
});
