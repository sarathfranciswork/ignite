import { CampaignStatus } from "@prisma/client";
import { differenceInDays } from "date-fns";

import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { SuccessFactorInput } from "./campaign-comparison.schemas";
import type { SuccessFactorEntry, SuccessFactorResult } from "./campaign-comparison.types";

const childLogger = logger.child({ service: "success-factor" });

export async function getSuccessFactors(input: SuccessFactorInput): Promise<SuccessFactorResult> {
  const dateFilter =
    input.dateRange?.from || input.dateRange?.to
      ? {
          createdAt: {
            ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
            ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
          },
        }
      : {};

  const campaignWhere: Record<string, unknown> = {
    ...dateFilter,
    status: { notIn: [CampaignStatus.DRAFT] },
  };

  if (input.campaignIds && input.campaignIds.length > 0) {
    campaignWhere.id = { in: input.campaignIds };
  }

  const campaigns = await prisma.campaign.findMany({
    where: campaignWhere,
    select: {
      id: true,
      title: true,
      status: true,
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

  const entries: SuccessFactorEntry[] = await Promise.all(
    campaigns.map(async (campaign) => {
      const ideaGroups = await prisma.idea.groupBy({
        by: ["status"],
        where: { campaignId: campaign.id },
        _count: { id: true },
      });

      const statusMap = new Map(ideaGroups.map((g) => [g.status, g._count.id]));

      const [engagementAgg, voteCount] = await Promise.all([
        prisma.idea.aggregate({
          where: { campaignId: campaign.id },
          _sum: { likesCount: true, commentsCount: true },
        }),
        prisma.ideaVote.count({
          where: { idea: { campaignId: campaign.id } },
        }),
      ]);

      let durationDays: number | null = null;
      if (campaign.launchedAt) {
        const endDate = campaign.closedAt ?? new Date();
        durationDays = differenceInDays(endDate, campaign.launchedAt);
      }

      const phaseCount = [
        campaign.hasSeedingPhase,
        campaign.hasDiscussionPhase,
        campaign.hasCommunityGraduation,
        campaign.hasQualificationPhase,
        campaign.hasVoting,
      ].filter(Boolean).length;

      const totalIdeas = campaign._count.ideas;
      const hotIdeas = statusMap.get("HOT") ?? 0;
      const evaluatedIdeas = statusMap.get("EVALUATION") ?? 0;
      const selectedIdeas = statusMap.get("SELECTED_IMPLEMENTATION") ?? 0;
      const memberCount = campaign._count.members;
      const ideasPerMember = memberCount > 0 ? totalIdeas / memberCount : 0;

      const totalLikes = engagementAgg._sum.likesCount ?? 0;
      const totalComments = engagementAgg._sum.commentsCount ?? 0;

      const successScore = calculateSuccessScore({
        totalIdeas,
        hotIdeas,
        selectedIdeas,
        ideasPerMember,
        totalComments,
        totalLikes,
        totalVotes: voteCount,
      });

      return {
        campaignId: campaign.id,
        title: campaign.title,
        status: campaign.status,
        configuration: {
          durationDays,
          phaseCount,
          hasVoting: campaign.hasVoting,
          hasLikes: campaign.hasLikes,
          hasSeedingPhase: campaign.hasSeedingPhase,
          hasDiscussionPhase: campaign.hasDiscussionPhase,
          hasCommunityGraduation: campaign.hasCommunityGraduation,
          hasQualificationPhase: campaign.hasQualificationPhase,
          hasIdeaCoach: campaign.hasIdeaCoach,
        },
        outcomes: {
          totalIdeas,
          hotIdeas,
          evaluatedIdeas,
          selectedIdeas,
          totalLikes,
          totalComments,
          totalVotes: voteCount,
          memberCount,
          ideasPerMember: Math.round(ideasPerMember * 100) / 100,
        },
        successScore,
      };
    }),
  );

  // Sort by success score descending
  entries.sort((a, b) => b.successScore - a.successScore);

  const durationsWithValues = entries
    .map((e) => e.configuration.durationDays)
    .filter((d): d is number => d !== null);

  const avgDurationDays =
    durationsWithValues.length > 0
      ? Math.round(durationsWithValues.reduce((sum, d) => sum + d, 0) / durationsWithValues.length)
      : null;

  const avgIdeasPerMember =
    entries.length > 0
      ? Math.round(
          (entries.reduce((sum, e) => sum + e.outcomes.ideasPerMember, 0) / entries.length) * 100,
        ) / 100
      : 0;

  const avgSuccessScore =
    entries.length > 0
      ? Math.round((entries.reduce((sum, e) => sum + e.successScore, 0) / entries.length) * 100) /
        100
      : 0;

  childLogger.info({ campaignCount: entries.length }, "Success factor analysis generated");

  return {
    entries,
    averages: {
      avgDurationDays,
      avgIdeasPerMember,
      avgSuccessScore,
    },
    analyzedAt: new Date().toISOString(),
  };
}

export function calculateSuccessScore(metrics: {
  totalIdeas: number;
  hotIdeas: number;
  selectedIdeas: number;
  ideasPerMember: number;
  totalComments: number;
  totalLikes: number;
  totalVotes: number;
}): number {
  // Weighted score (0-100 scale)
  // Idea generation: 25% weight
  const ideaScore = Math.min(metrics.totalIdeas / 20, 1) * 25;
  // Quality (hot + selected): 30% weight
  const qualityScore = Math.min((metrics.hotIdeas + metrics.selectedIdeas) / 10, 1) * 30;
  // Participation (ideas per member): 20% weight
  const participationScore = Math.min(metrics.ideasPerMember / 2, 1) * 20;
  // Engagement (comments + likes + votes): 25% weight
  const engagementTotal = metrics.totalComments + metrics.totalLikes + metrics.totalVotes;
  const engagementScore = Math.min(engagementTotal / 100, 1) * 25;

  return Math.round((ideaScore + qualityScore + participationScore + engagementScore) * 100) / 100;
}
