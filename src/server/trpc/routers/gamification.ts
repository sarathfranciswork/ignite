import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  gamificationConfigureInput,
  gamificationGetConfigInput,
  gamificationLeaderboardInput,
  gamificationUserScoreInput,
  gamificationRecalculateInput,
  gamificationResetInput,
  configureGamification,
  getConfig,
  getLeaderboard,
  getUserScore,
  recalculateScores,
  resetScores,
  GamificationServiceError,
} from "@/server/services/gamification.service";
import {
  perspectiveSetInput,
  perspectiveGetInput,
  perspectivesByIdeaInput,
  perspectiveDistributionInput,
  perspectiveRemoveInput,
  setPerspective,
  getPerspective,
  getCommentsByPerspective,
  getPerspectiveDistribution,
  removePerspective,
  PerspectiveServiceError,
} from "@/server/services/discussion-perspective.service";

function handleGamificationError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof GamificationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      CONFIG_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  if (error instanceof PerspectiveServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      COMMENT_NOT_FOUND: "NOT_FOUND",
      PERSPECTIVE_NOT_FOUND: "NOT_FOUND",
    };

    throw new TRPCError({
      code: codeMap[error.code] ?? "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export const gamificationRouter = createTRPCRouter({
  // ── Gamification Config ──────────────────────────────────
  configure: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_CONFIGURE))
    .input(gamificationConfigureInput)
    .mutation(async ({ input }) => {
      try {
        return await configureGamification(input);
      } catch (error) {
        handleGamificationError(error);
      }
    }),

  getConfig: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_READ))
    .input(gamificationGetConfigInput)
    .query(async ({ input }) => {
      return getConfig(input);
    }),

  // ── Leaderboard ──────────────────────────────────────────
  getLeaderboard: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_READ))
    .input(gamificationLeaderboardInput)
    .query(async ({ input }) => {
      try {
        return await getLeaderboard(input);
      } catch (error) {
        handleGamificationError(error);
      }
    }),

  getUserScore: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_READ))
    .input(gamificationUserScoreInput)
    .query(async ({ input }) => {
      return getUserScore(input);
    }),

  // ── Admin Operations ─────────────────────────────────────
  recalculate: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_RECALCULATE))
    .input(gamificationRecalculateInput)
    .mutation(async ({ input }) => {
      try {
        return await recalculateScores(input);
      } catch (error) {
        handleGamificationError(error);
      }
    }),

  reset: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_RECALCULATE))
    .input(gamificationResetInput)
    .mutation(async ({ input }) => {
      return resetScores(input);
    }),

  // ── Discussion Perspectives ──────────────────────────────
  setPerspective: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_SET_PERSPECTIVE))
    .input(perspectiveSetInput)
    .mutation(async ({ input }) => {
      try {
        return await setPerspective(input);
      } catch (error) {
        handleGamificationError(error);
      }
    }),

  getPerspective: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_READ))
    .input(perspectiveGetInput)
    .query(async ({ input }) => {
      return getPerspective(input);
    }),

  getCommentsByPerspective: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_READ))
    .input(perspectivesByIdeaInput)
    .query(async ({ input }) => {
      return getCommentsByPerspective(input);
    }),

  getPerspectiveDistribution: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_READ))
    .input(perspectiveDistributionInput)
    .query(async ({ input }) => {
      return getPerspectiveDistribution(input);
    }),

  removePerspective: protectedProcedure
    .use(requirePermission(Action.GAMIFICATION_SET_PERSPECTIVE))
    .input(perspectiveRemoveInput)
    .mutation(async ({ input }) => {
      try {
        return await removePerspective(input);
      } catch (error) {
        handleGamificationError(error);
      }
    }),
});
