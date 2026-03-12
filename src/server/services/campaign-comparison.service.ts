import { differenceInDays } from "date-fns";

import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { CampaignComparisonInput } from "./campaign-comparison.schemas";
import {
  CampaignComparisonServiceError,
  type CampaignComparisonResult,
  type CampaignMetrics,
} from "./campaign-comparison.types";

export type {
  CampaignComparisonResult,
  SuccessFactorResult,
  OrganizationAnalysisResult,
} from "./campaign-comparison.types";
export { CampaignComparisonServiceError } from "./campaign-comparison.types";
export { getSuccessFactors } from "./success-factor.service";
export { getOrganizationAnalysis } from "./organization-analysis.service";

const childLogger = logger.child({ service: "campaign-comparison" });

export async function compareCampaigns(
  input: CampaignComparisonInput,
): Promise<CampaignComparisonResult> {
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: input.campaignIds } },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      launchedAt: true,
      closedAt: true,
      hasSeedingPhase: true,
      hasDiscussionPhase: true,
      hasCommunityGraduation: true,
      hasQualificationPhase: true,
      hasVoting: true,
      hasLikes: true,
      hasIdeaCoach: true,
      _count: {
        select: { members: true, ideas: true },
      },
    },
  });

  if (campaigns.length < 2) {
    throw new CampaignComparisonServiceError(
      "INSUFFICIENT_CAMPAIGNS",
      "At least 2 valid campaigns are required for comparison",
    );
  }

  const campaignMetrics: CampaignMetrics[] = await Promise.all(
    campaigns.map(async (campaign) => {
      const [ideaGroups, engagementAgg, voteCount, snapshots] = await Promise.all([
        prisma.idea.groupBy({
          by: ["status"],
          where: { campaignId: campaign.id },
          _count: { id: true },
        }),
        prisma.idea.aggregate({
          where: { campaignId: campaign.id },
          _sum: { likesCount: true, commentsCount: true },
        }),
        prisma.ideaVote.count({
          where: { idea: { campaignId: campaign.id } },
        }),
        prisma.campaignKpiSnapshot.findMany({
          where: { campaignId: campaign.id },
          orderBy: { snapshotDate: "asc" },
          select: {
            snapshotDate: true,
            ideasSubmitted: true,
            totalComments: true,
            totalVotes: true,
            totalLikes: true,
            totalViews: true,
            uniqueVisitors: true,
          },
        }),
      ]);

      const ideaStatusBreakdown: Record<string, number> = {};
      for (const group of ideaGroups) {
        ideaStatusBreakdown[group.status] = group._count.id;
      }

      const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

      let durationDays: number | null = null;
      if (campaign.launchedAt) {
        const endDate = campaign.closedAt ?? new Date();
        durationDays = differenceInDays(endDate, campaign.launchedAt);
      }

      return {
        campaignId: campaign.id,
        title: campaign.title,
        status: campaign.status,
        createdAt: campaign.createdAt.toISOString(),
        launchedAt: campaign.launchedAt?.toISOString() ?? null,
        closedAt: campaign.closedAt?.toISOString() ?? null,
        durationDays,
        memberCount: campaign._count.members,
        ideaCount: campaign._count.ideas,
        ideaStatusBreakdown,
        engagement: {
          totalLikes: engagementAgg._sum.likesCount ?? 0,
          totalComments: engagementAgg._sum.commentsCount ?? 0,
          totalVotes: voteCount,
          totalViews: latestSnapshot?.totalViews ?? 0,
          uniqueVisitors: latestSnapshot?.uniqueVisitors ?? 0,
        },
        configuration: {
          hasSeedingPhase: campaign.hasSeedingPhase,
          hasDiscussionPhase: campaign.hasDiscussionPhase,
          hasCommunityGraduation: campaign.hasCommunityGraduation,
          hasQualificationPhase: campaign.hasQualificationPhase,
          hasVoting: campaign.hasVoting,
          hasLikes: campaign.hasLikes,
          hasIdeaCoach: campaign.hasIdeaCoach,
        },
        kpiTimeSeries: snapshots.map((s) => ({
          date: s.snapshotDate.toISOString().split("T")[0] ?? "",
          ideasSubmitted: s.ideasSubmitted,
          totalComments: s.totalComments,
          totalVotes: s.totalVotes,
          totalLikes: s.totalLikes,
        })),
      };
    }),
  );

  childLogger.info(
    { campaignIds: input.campaignIds, count: campaignMetrics.length },
    "Campaign comparison generated",
  );

  return {
    campaigns: campaignMetrics,
    comparedAt: new Date().toISOString(),
  };
}
