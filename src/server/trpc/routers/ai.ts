import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import { findSimilarIdeasInput } from "@/server/services/similarity.schemas";
import { findSimilarIdeas, getAiStatus } from "@/server/services/similarity.service";

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
});
