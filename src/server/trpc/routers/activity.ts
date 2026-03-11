import { createTRPCRouter, protectedProcedure, requirePermission } from "../trpc";
import { Action } from "@/server/lib/permissions";
import {
  activityListInput,
  activityListByCampaignInput,
  listActivityByIdea,
  listActivityByCampaign,
} from "@/server/services/activity.service";
import { graduationProgressInput } from "@/server/services/graduation.schemas";
import { getGraduationProgress } from "@/server/services/graduation.service";

export const activityRouter = createTRPCRouter({
  listByIdea: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(activityListInput)
    .query(async ({ input }) => {
      return listActivityByIdea(input);
    }),

  listByCampaign: protectedProcedure
    .use(
      requirePermission<{ campaignId: string }>(Action.CAMPAIGN_READ, (input) => input.campaignId),
    )
    .input(activityListByCampaignInput)
    .query(async ({ input }) => {
      return listActivityByCampaign(input);
    }),

  graduationProgress: protectedProcedure
    .use(requirePermission(Action.IDEA_READ))
    .input(graduationProgressInput)
    .query(async ({ input }) => {
      return getGraduationProgress(input.ideaId);
    }),
});
