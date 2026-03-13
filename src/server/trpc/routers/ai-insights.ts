import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  scoreIdeaInput,
  batchScoreIdeasInput,
  getIdeaScoreInput,
  getScoreHistoryInput,
  getCampaignScoreDistributionInput,
} from "@/server/services/ai-scoring.schemas";
import {
  scoreIdea,
  batchScoreIdeas,
  getIdeaScore,
  getScoreHistory,
  getCampaignScoreDistribution,
  AiScoringServiceError,
} from "@/server/services/ai-scoring.service";
import {
  categorizeIdeaInput,
  batchCategorizeInput,
  getSuggestedTagsInput,
  acceptTagInput,
  rejectTagInput,
} from "@/server/services/ai-categorization.schemas";
import {
  categorizeIdea,
  batchCategorize,
  getSuggestedTags,
  acceptTag,
  rejectTag,
  AiCategorizationServiceError,
} from "@/server/services/ai-categorization.service";
import {
  generateRecommendationsInput,
  getRecommendationsInput,
  dismissRecommendationInput,
  linkRecommendationInput,
} from "@/server/services/ai-scouting.schemas";
import {
  generateRecommendations,
  getRecommendations,
  dismissRecommendation,
  linkRecommendation,
  AiScoutingServiceError,
} from "@/server/services/ai-scouting.service";

function handleAiInsightsError(error: unknown): never {
  if (error instanceof TRPCError) throw error;

  if (error instanceof AiScoringServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      IDEA_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  if (error instanceof AiCategorizationServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      IDEA_NOT_FOUND: "NOT_FOUND",
      CAMPAIGN_NOT_FOUND: "NOT_FOUND",
      TAG_NOT_FOUND: "NOT_FOUND",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  if (error instanceof AiScoutingServiceError) {
    const codeMap: Record<string, "NOT_FOUND" | "BAD_REQUEST"> = {
      SIA_NOT_FOUND: "NOT_FOUND",
      RECOMMENDATION_NOT_FOUND: "NOT_FOUND",
      ORGANIZATION_NOT_FOUND: "NOT_FOUND",
    };
    throw new TRPCError({
      code: codeMap[error.code] ?? "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  throw error;
}

export const aiInsightsRouter = createTRPCRouter({
  // ── Predictive Scoring ─────────────────────────────────────
  scoreIdea: protectedProcedure
    .use(requirePermission(Action.AI_SCORE_IDEA))
    .input(scoreIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await scoreIdea(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  batchScore: protectedProcedure
    .use(requirePermission(Action.AI_BATCH_SCORE))
    .input(batchScoreIdeasInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await batchScoreIdeas(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  getScore: protectedProcedure
    .use(requirePermission(Action.AI_SCORE_IDEA))
    .input(getIdeaScoreInput)
    .query(async ({ input }) => {
      return getIdeaScore(input);
    }),

  getScoreHistory: protectedProcedure
    .use(requirePermission(Action.AI_SCORE_IDEA))
    .input(getScoreHistoryInput)
    .query(async ({ input }) => {
      return getScoreHistory(input);
    }),

  getScoreDistribution: protectedProcedure
    .use(requirePermission(Action.AI_SCORE_IDEA))
    .input(getCampaignScoreDistributionInput)
    .query(async ({ input }) => {
      try {
        return await getCampaignScoreDistribution(input);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  // ── Auto-Categorization ────────────────────────────────────
  categorize: protectedProcedure
    .use(requirePermission(Action.AI_CATEGORIZE))
    .input(categorizeIdeaInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await categorizeIdea(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  batchCategorize: protectedProcedure
    .use(requirePermission(Action.AI_BATCH_SCORE))
    .input(batchCategorizeInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await batchCategorize(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  getSuggestedTags: protectedProcedure
    .use(requirePermission(Action.AI_CATEGORIZE))
    .input(getSuggestedTagsInput)
    .query(async ({ input }) => {
      return getSuggestedTags(input);
    }),

  acceptTag: protectedProcedure
    .use(requirePermission(Action.AI_MANAGE_TAGS))
    .input(acceptTagInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await acceptTag(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  rejectTag: protectedProcedure
    .use(requirePermission(Action.AI_MANAGE_TAGS))
    .input(rejectTagInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectTag(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  // ── Scouting Recommendations ───────────────────────────────
  generateRecommendations: protectedProcedure
    .use(requirePermission(Action.AI_SCOUTING))
    .input(generateRecommendationsInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateRecommendations(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  getRecommendations: protectedProcedure
    .use(requirePermission(Action.AI_SCOUTING))
    .input(getRecommendationsInput)
    .query(async ({ input }) => {
      return getRecommendations(input);
    }),

  dismissRecommendation: protectedProcedure
    .use(requirePermission(Action.AI_SCOUTING))
    .input(dismissRecommendationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await dismissRecommendation(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),

  linkRecommendation: protectedProcedure
    .use(requirePermission(Action.AI_SCOUTING))
    .input(linkRecommendationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        return await linkRecommendation(input, ctx.session.user.id);
      } catch (error) {
        handleAiInsightsError(error);
      }
    }),
});
