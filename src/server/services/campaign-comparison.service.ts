import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type {
  CampaignComparisonInput,
  SuccessFactorInput,
  OrganizationAnalysisInput,
} from "./campaign-comparison.schemas";

const childLogger = logger.child({ service: "campaign-comparison" });

export class CampaignComparisonServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CampaignComparisonServiceError";
  }
}

// ── Types ────────────────────────────────────────────────────

interface CampaignMetrics {
  campaignId: string;
  title: string;
  status: string;
  createdAt: string;
  launchedAt: string | null;
  closedAt: string | null;
  durationDays: number | null;
  memberCount: number;
  ideaCount: number;
  ideaStatusBreakdown: Record<string, number>;
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
    totalViews: number;
    uniqueVisitors: number;
  };
  configuration: {
    hasSeedingPhase: boolean;
    hasDiscussionPhase: boolean;
    hasCommunityGraduation: boolean;
    hasQualificationPhase: boolean;
    hasVoting: boolean;
    hasLikes: boolean;
    hasIdeaCoach: boolean;
  };
  kpiTimeSeries: Array<{
    date: string;
    ideasSubmitted: number;
    totalComments: number;
    totalVotes: number;
    totalLikes: number;
  }>;
}

export interface CampaignComparisonResult {
  campaigns: CampaignMetrics[];
  comparedAt: string;
}

interface SuccessFactorEntry {
  campaignId: string;
  title: string;
  status: string;
  configuration: {
    durationDays: number | null;
    phaseCount: number;
    hasVoting: boolean;
    hasLikes: boolean;
    hasSeedingPhase: boolean;
    hasDiscussionPhase: boolean;
    hasCommunityGraduation: boolean;
    hasQualificationPhase: boolean;
    hasIdeaCoach: boolean;
  };
  outcomes: {
    totalIdeas: number;
    hotIdeas: number;
    evaluatedIdeas: number;
    selectedIdeas: number;
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
    memberCount: number;
    ideasPerMember: number;
  };
  successScore: number;
}

export interface SuccessFactorResult {
  entries: SuccessFactorEntry[];
  averages: {
    avgDurationDays: number | null;
    avgIdeasPerMember: number;
    avgSuccessScore: number;
  };
  analyzedAt: string;
}

interface OrgUnitActivity {
  orgUnitId: string;
  orgUnitName: string;
  memberCount: number;
  ideasSubmitted: number;
  commentsContributed: number;
  votesParticipated: number;
  likesGiven: number;
  campaignsParticipated: number;
}

export interface OrganizationAnalysisResult {
  orgUnits: OrgUnitActivity[];
  totals: {
    totalOrgUnits: number;
    totalMembers: number;
    totalIdeas: number;
    totalComments: number;
    totalVotes: number;
  };
  analyzedAt: string;
}

// ── Service Functions ────────────────────────────────────────

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

  const campaignMetrics: CampaignMetrics[] = [];

  for (const campaign of campaigns) {
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
      durationDays = Math.round(
        (endDate.getTime() - campaign.launchedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    campaignMetrics.push({
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
    });
  }

  childLogger.info(
    { campaignIds: input.campaignIds, count: campaignMetrics.length },
    "Campaign comparison generated",
  );

  return {
    campaigns: campaignMetrics,
    comparedAt: new Date().toISOString(),
  };
}

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
    status: { notIn: ["DRAFT"] },
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

  const entries: SuccessFactorEntry[] = [];

  for (const campaign of campaigns) {
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
      durationDays = Math.round(
        (endDate.getTime() - campaign.launchedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
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

    // Success score: weighted composite of key outcomes normalized
    const successScore = calculateSuccessScore({
      totalIdeas,
      hotIdeas,
      selectedIdeas,
      ideasPerMember,
      totalComments,
      totalLikes,
      totalVotes: voteCount,
    });

    entries.push({
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
    });
  }

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

export async function getOrganizationAnalysis(
  input: OrganizationAnalysisInput,
): Promise<OrganizationAnalysisResult> {
  const orgUnitWhere: Record<string, unknown> = { isActive: true };
  if (input.orgUnitIds && input.orgUnitIds.length > 0) {
    orgUnitWhere.id = { in: input.orgUnitIds };
  }

  const orgUnits = await prisma.orgUnit.findMany({
    where: orgUnitWhere,
    select: {
      id: true,
      name: true,
      userAssignments: {
        select: { userId: true },
      },
    },
  });

  const dateFilter =
    input.dateRange?.from || input.dateRange?.to
      ? {
          createdAt: {
            ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
            ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
          },
        }
      : {};

  const orgUnitActivities: OrgUnitActivity[] = [];

  for (const orgUnit of orgUnits) {
    const userIds = orgUnit.userAssignments.map((a) => a.userId);

    if (userIds.length === 0) {
      orgUnitActivities.push({
        orgUnitId: orgUnit.id,
        orgUnitName: orgUnit.name,
        memberCount: 0,
        ideasSubmitted: 0,
        commentsContributed: 0,
        votesParticipated: 0,
        likesGiven: 0,
        campaignsParticipated: 0,
      });
      continue;
    }

    const [ideaCount, commentCount, voteCount, likeCount, campaignCount] = await Promise.all([
      prisma.idea.count({
        where: {
          contributorId: { in: userIds },
          ...dateFilter,
        },
      }),
      prisma.comment.count({
        where: {
          authorId: { in: userIds },
          ...dateFilter,
        },
      }),
      prisma.ideaVote.count({
        where: {
          userId: { in: userIds },
          ...dateFilter,
        },
      }),
      prisma.ideaLike.count({
        where: {
          userId: { in: userIds },
          ...dateFilter,
        },
      }),
      prisma.campaignMember.count({
        where: {
          userId: { in: userIds },
          ...(input.dateRange?.from || input.dateRange?.to
            ? {
                assignedAt: {
                  ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
                  ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
                },
              }
            : {}),
        },
      }),
    ]);

    orgUnitActivities.push({
      orgUnitId: orgUnit.id,
      orgUnitName: orgUnit.name,
      memberCount: userIds.length,
      ideasSubmitted: ideaCount,
      commentsContributed: commentCount,
      votesParticipated: voteCount,
      likesGiven: likeCount,
      campaignsParticipated: campaignCount,
    });
  }

  const totals = {
    totalOrgUnits: orgUnitActivities.length,
    totalMembers: orgUnitActivities.reduce((sum, o) => sum + o.memberCount, 0),
    totalIdeas: orgUnitActivities.reduce((sum, o) => sum + o.ideasSubmitted, 0),
    totalComments: orgUnitActivities.reduce((sum, o) => sum + o.commentsContributed, 0),
    totalVotes: orgUnitActivities.reduce((sum, o) => sum + o.votesParticipated, 0),
  };

  childLogger.info({ orgUnitCount: orgUnitActivities.length }, "Organization analysis generated");

  return {
    orgUnits: orgUnitActivities,
    totals,
    analyzedAt: new Date().toISOString(),
  };
}

// ── Helpers ─────────────────────────────────────────────────

function calculateSuccessScore(metrics: {
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
