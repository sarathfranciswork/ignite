import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import { findSimilarIdeasInput } from "@/server/services/similarity.schemas";
import { findSimilarIdeas, getAiStatus } from "@/server/services/similarity.service";
import { enrichIdeaInput } from "@/server/services/enrichment.schemas";
import { enrichIdea, getEnrichmentStatus } from "@/server/services/enrichment.service";

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

  enrichIdea: protectedProcedure
    .use(requirePermission(Action.AI_ENRICH_IDEA))
    .input(enrichIdeaInput)
    .mutation(async ({ input }) => {
      return enrichIdea(input);
    }),
});
