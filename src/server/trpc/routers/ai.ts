import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import { findSimilarIdeasInput } from "@/server/services/similarity.schemas";
import { findSimilarIdeas, getAiStatus } from "@/server/services/similarity.service";
import { enrichIdeaInput, copilotEventInput } from "@/server/services/enrichment.schemas";
import {
  enrichIdea,
  recordCopilotEvent,
  getEnrichmentStatus,
} from "@/server/services/enrichment.service";
import {
  campaignSummaryInput,
  evaluationSummaryInput,
  notificationDigestInput,
} from "@/server/services/summarization.schemas";
import {
  summarizeCampaign,
  summarizeEvaluationSession,
  summarizeNotificationDigest,
  getSummarizationStatus,
} from "@/server/services/summarization.service";

export const aiRouter = createTRPCRouter({
  status: protectedProcedure.use(requirePermission(Action.AI_VIEW_STATUS)).query(() => {
    return getAiStatus();
  }),

  findSimilar: protectedProcedure
    .use(requirePermission(Action.AI_FIND_SIMILAR))
    .input(findSimilarIdeasInput)
    .query(async ({ input }) => {
      return findSimilarIdeas(input);
    }),

  enrichmentStatus: protectedProcedure.use(requirePermission(Action.AI_ENRICH_IDEA)).query(() => {
    return getEnrichmentStatus();
  }),

  enrich: protectedProcedure
    .use(requirePermission(Action.AI_ENRICH_IDEA))
    .input(enrichIdeaInput)
    .mutation(async ({ input }) => {
      return enrichIdea(input);
    }),

  copilotEvent: protectedProcedure
    .use(requirePermission(Action.AI_ENRICH_IDEA))
    .input(copilotEventInput)
    .mutation(({ ctx, input }) => {
      recordCopilotEvent(input, ctx.session.user.id);
      return { success: true };
    }),

  summarizationStatus: protectedProcedure.use(requirePermission(Action.AI_SUMMARIZE)).query(() => {
    return getSummarizationStatus();
  }),

  summarizeCampaign: protectedProcedure
    .use(requirePermission(Action.AI_SUMMARIZE))
    .input(campaignSummaryInput)
    .query(async ({ input }) => {
      return summarizeCampaign(input.campaignId);
    }),

  summarizeEvaluation: protectedProcedure
    .use(requirePermission(Action.AI_SUMMARIZE))
    .input(evaluationSummaryInput)
    .query(async ({ input }) => {
      return summarizeEvaluationSession(input.sessionId);
    }),

  summarizeNotificationDigest: protectedProcedure
    .use(requirePermission(Action.AI_SUMMARIZE))
    .input(notificationDigestInput)
    .query(async ({ ctx, input }) => {
      return summarizeNotificationDigest(ctx.session.user.id, input.limit);
    }),
});
