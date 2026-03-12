import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { IdeaStatus } from "@prisma/client";
import type { CampaignComparisonInput, SuccessFactorInput } from "./campaign-comparison.schemas";

const childLogger = logger.child({ service: "campaign-comparison" });

// ── Types ────────────────────────────────────────────────────

export interface CampaignKpiRow {
  campaignId: string;
  title: string;
  status: string;
  memberCount: number;
  ideaCount: number;
  participationRate: number;
  averageVotes: number;
  hotGraduationRate: number;
  evaluationCompletionRate: number;
  shortlistCount: number;
  totalLikes: number;
  totalComments: number;
  totalVotes: number;
  duration: number | null;
  hasIdeaCoach: boolean;
  votingCriteriaCount: number;
  graduationThreshold: number;
}

export interface MetricHighlight {
  metric: string;
  min: number;
  max: number;
  spread: number;
  isSignificant: boolean;
}

export interface CampaignComparisonResult {
  campaigns: CampaignKpiRow[];
  highlights: MetricHighlight[];
  radarMetrics: Array<{
    metric: string;
    values: Array<{ campaignId: string; value: number }>;
  }>;
}

export interface SuccessFactorCorrelation {
  factor: string;
  xLabel: string;
  yLabel: string;
  dataPoints: Array<{
    campaignId: string;
    title: string;
    x: number;
    y: number;
  }>;
  correlationStrength: number;
  direction: "positive" | "negative" | "none";
}

export interface SuccessFactorRecommendation {
  factor: string;
  insight: string;
  recommendedRange: string;
}

export interface SuccessFactorResult {
  correlations: SuccessFactorCorrelation[];
  recommendations: SuccessFactorRecommendation[];
  campaignCount: number;
}

// ── Helpers ──────────────────────────────────────────────────

function calculateCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - meanX;
    const dy = (ys[i] ?? 0) - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  if (denom === 0) return 0;

  return numerator / denom;
}

function getCorrelationDirection(r: number): "positive" | "negative" | "none" {
  if (r > 0.3) return "positive";
  if (r < -0.3) return "negative";
  return "none";
}

function normalizeToPercent(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((value / max) * 100);
}

function getDurationDays(campaign: {
  launchedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
}): number | null {
  const start = campaign.launchedAt ?? campaign.createdAt;
  const end = campaign.closedAt ?? new Date();
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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
      launchedAt: true,
      closedAt: true,
      createdAt: true,
      hasIdeaCoach: true,
      votingCriteria: true,
      graduationLikes: true,
      graduationCommenters: true,
      graduationVisitors: true,
      graduationVoters: true,
      _count: {
        select: { members: true, ideas: true },
      },
    },
  });

  if (campaigns.length < 2) {
    throw new CampaignComparisonError(
      "INSUFFICIENT_CAMPAIGNS",
      "At least 2 valid campaigns are required for comparison",
    );
  }

  const kpiRows: CampaignKpiRow[] = [];

  for (const campaign of campaigns) {
    const [
      ideaStatusGroups,
      engagementAgg,
      voteCount,
      shortlistCount,
      evalSessionCount,
      completedEvalCount,
    ] = await Promise.all([
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
      prisma.evaluationShortlistItem.count({
        where: { session: { campaignId: campaign.id } },
      }),
      prisma.evaluationSession.count({
        where: { campaignId: campaign.id },
      }),
      prisma.evaluationSession.count({
        where: { campaignId: campaign.id, status: "COMPLETED" },
      }),
    ]);

    const statusMap = new Map(ideaStatusGroups.map((g) => [g.status, g._count.id]));

    const totalIdeas = campaign._count.ideas;
    const hotCount = statusMap.get(IdeaStatus.HOT) ?? 0;
    const evaluatedCount = statusMap.get(IdeaStatus.EVALUATION) ?? 0;
    const selectedCount = statusMap.get(IdeaStatus.SELECTED_IMPLEMENTATION) ?? 0;
    const implementedCount = statusMap.get(IdeaStatus.IMPLEMENTED) ?? 0;

    const advancedPastDraft = totalIdeas - (statusMap.get(IdeaStatus.DRAFT) ?? 0);
    const hotGraduationRate =
      advancedPastDraft > 0
        ? (hotCount + evaluatedCount + selectedCount + implementedCount) / advancedPastDraft
        : 0;

    const participationRate =
      campaign._count.members > 0 ? totalIdeas / campaign._count.members : 0;

    const averageVotes = totalIdeas > 0 ? voteCount / totalIdeas : 0;

    const evaluationCompletionRate =
      evalSessionCount > 0 ? completedEvalCount / evalSessionCount : 0;

    const votingCriteriaArray = campaign.votingCriteria as unknown[];
    const votingCriteriaCount = Array.isArray(votingCriteriaArray) ? votingCriteriaArray.length : 0;

    const graduationThreshold =
      campaign.graduationLikes +
      campaign.graduationCommenters +
      campaign.graduationVisitors +
      campaign.graduationVoters;

    kpiRows.push({
      campaignId: campaign.id,
      title: campaign.title,
      status: campaign.status,
      memberCount: campaign._count.members,
      ideaCount: totalIdeas,
      participationRate: Math.round(participationRate * 100) / 100,
      averageVotes: Math.round(averageVotes * 100) / 100,
      hotGraduationRate: Math.round(hotGraduationRate * 100) / 100,
      evaluationCompletionRate: Math.round(evaluationCompletionRate * 100) / 100,
      shortlistCount,
      totalLikes: engagementAgg._sum.likesCount ?? 0,
      totalComments: engagementAgg._sum.commentsCount ?? 0,
      totalVotes: voteCount,
      duration: getDurationDays(campaign),
      hasIdeaCoach: campaign.hasIdeaCoach,
      votingCriteriaCount,
      graduationThreshold,
    });
  }

  // Calculate highlights — metrics with >50% spread are significant
  const metricKeys: Array<{ key: keyof CampaignKpiRow; label: string }> = [
    { key: "participationRate", label: "Participation Rate" },
    { key: "ideaCount", label: "Idea Count" },
    { key: "averageVotes", label: "Average Votes" },
    { key: "hotGraduationRate", label: "HOT! Graduation Rate" },
    { key: "evaluationCompletionRate", label: "Evaluation Completion Rate" },
    { key: "shortlistCount", label: "Shortlist Count" },
    { key: "totalLikes", label: "Total Likes" },
    { key: "totalComments", label: "Total Comments" },
  ];

  const highlights: MetricHighlight[] = metricKeys.map(({ key, label }) => {
    const values = kpiRows.map((r) => r[key] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const spread = avg > 0 ? (max - min) / avg : 0;

    return {
      metric: label,
      min,
      max,
      spread: Math.round(spread * 100) / 100,
      isSignificant: spread > 0.5,
    };
  });

  // Build radar chart data — normalize all metrics to 0-100 scale
  const radarKeys: Array<{ key: keyof CampaignKpiRow; label: string }> = [
    { key: "participationRate", label: "Participation" },
    { key: "hotGraduationRate", label: "HOT! Rate" },
    { key: "evaluationCompletionRate", label: "Eval Completion" },
    { key: "averageVotes", label: "Avg Votes" },
    { key: "totalLikes", label: "Engagement" },
    { key: "shortlistCount", label: "Shortlisted" },
  ];

  const radarMetrics = radarKeys.map(({ key, label }) => {
    const values = kpiRows.map((r) => r[key] as number);
    const max = Math.max(...values, 1);

    return {
      metric: label,
      values: kpiRows.map((r) => ({
        campaignId: r.campaignId,
        value: normalizeToPercent(r[key] as number, max),
      })),
    };
  });

  childLogger.info(
    { campaignIds: input.campaignIds, campaignCount: campaigns.length },
    "Campaign comparison report generated",
  );

  return { campaigns: kpiRows, highlights, radarMetrics };
}

export async function getSuccessFactors(input: SuccessFactorInput): Promise<SuccessFactorResult> {
  const dateFilter = input.dateRange?.from
    ? {
        createdAt: {
          ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
          ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
        },
      }
    : {};

  // Get all non-draft campaigns with enough data
  const campaigns = await prisma.campaign.findMany({
    where: {
      ...dateFilter,
      status: { notIn: ["DRAFT"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      launchedAt: true,
      closedAt: true,
      createdAt: true,
      hasIdeaCoach: true,
      votingCriteria: true,
      graduationLikes: true,
      graduationCommenters: true,
      graduationVisitors: true,
      graduationVoters: true,
      _count: {
        select: { members: true, ideas: true },
      },
    },
  });

  if (campaigns.length === 0) {
    return { correlations: [], recommendations: [], campaignCount: 0 };
  }

  // Compute metrics for each campaign
  const enrichedCampaigns = await Promise.all(
    campaigns.map(async (campaign) => {
      const [ideaStatusGroups, voteCount, evalSessions] = await Promise.all([
        prisma.idea.groupBy({
          by: ["status"],
          where: { campaignId: campaign.id },
          _count: { id: true },
        }),
        prisma.ideaVote.count({
          where: { idea: { campaignId: campaign.id } },
        }),
        prisma.evaluationSession.findMany({
          where: { campaignId: campaign.id },
          select: {
            status: true,
            _count: { select: { responses: true } },
          },
        }),
      ]);

      const statusMap = new Map(ideaStatusGroups.map((g) => [g.status, g._count.id]));

      const totalIdeas = campaign._count.ideas;
      const hotCount = statusMap.get(IdeaStatus.HOT) ?? 0;
      const evaluatedCount = statusMap.get(IdeaStatus.EVALUATION) ?? 0;
      const selectedCount = statusMap.get(IdeaStatus.SELECTED_IMPLEMENTATION) ?? 0;
      const implementedCount = statusMap.get(IdeaStatus.IMPLEMENTED) ?? 0;
      const advancedPastDraft = totalIdeas - (statusMap.get(IdeaStatus.DRAFT) ?? 0);

      const participationRate =
        campaign._count.members > 0 ? totalIdeas / campaign._count.members : 0;

      const hotRate =
        advancedPastDraft > 0
          ? (hotCount + evaluatedCount + selectedCount + implementedCount) / advancedPastDraft
          : 0;

      const totalResponses = evalSessions.reduce((sum, s) => sum + s._count.responses, 0);
      const evalQuality = evalSessions.length > 0 ? totalResponses / evalSessions.length : 0;

      const votingCriteriaArray = campaign.votingCriteria as unknown[];
      const votingCriteriaCount = Array.isArray(votingCriteriaArray)
        ? votingCriteriaArray.length
        : 0;

      const graduationThreshold =
        campaign.graduationLikes +
        campaign.graduationCommenters +
        campaign.graduationVisitors +
        campaign.graduationVoters;

      return {
        campaignId: campaign.id,
        title: campaign.title,
        duration: getDurationDays(campaign) ?? 0,
        participationRate,
        audienceSize: campaign._count.members,
        hotRate,
        evalQuality,
        votingCriteriaCount,
        graduationThreshold,
        hasIdeaCoach: campaign.hasIdeaCoach,
        averageVotes: totalIdeas > 0 ? voteCount / totalIdeas : 0,
      };
    }),
  );

  // Build correlations
  const correlations: SuccessFactorCorrelation[] = [];

  // 1. Duration vs participation rate
  const durationXs = enrichedCampaigns.map((c) => c.duration);
  const partYs = enrichedCampaigns.map((c) => c.participationRate);
  const durationPartCorr = calculateCorrelation(durationXs, partYs);
  correlations.push({
    factor: "duration_vs_participation",
    xLabel: "Duration (days)",
    yLabel: "Participation Rate",
    dataPoints: enrichedCampaigns.map((c) => ({
      campaignId: c.campaignId,
      title: c.title,
      x: c.duration,
      y: Math.round(c.participationRate * 100) / 100,
    })),
    correlationStrength: Math.round(Math.abs(durationPartCorr) * 100) / 100,
    direction: getCorrelationDirection(durationPartCorr),
  });

  // 2. Voting criteria count vs evaluation quality
  const votCritXs = enrichedCampaigns.map((c) => c.votingCriteriaCount);
  const evalQualYs = enrichedCampaigns.map((c) => c.evalQuality);
  const votCritCorr = calculateCorrelation(votCritXs, evalQualYs);
  correlations.push({
    factor: "voting_criteria_vs_eval_quality",
    xLabel: "Voting Criteria Count",
    yLabel: "Evaluation Quality",
    dataPoints: enrichedCampaigns.map((c) => ({
      campaignId: c.campaignId,
      title: c.title,
      x: c.votingCriteriaCount,
      y: Math.round(c.evalQuality * 100) / 100,
    })),
    correlationStrength: Math.round(Math.abs(votCritCorr) * 100) / 100,
    direction: getCorrelationDirection(votCritCorr),
  });

  // 3. Audience size vs participation rate
  const audXs = enrichedCampaigns.map((c) => c.audienceSize);
  const audCorr = calculateCorrelation(audXs, partYs);
  correlations.push({
    factor: "audience_size_vs_participation",
    xLabel: "Audience Size",
    yLabel: "Participation Rate",
    dataPoints: enrichedCampaigns.map((c) => ({
      campaignId: c.campaignId,
      title: c.title,
      x: c.audienceSize,
      y: Math.round(c.participationRate * 100) / 100,
    })),
    correlationStrength: Math.round(Math.abs(audCorr) * 100) / 100,
    direction: getCorrelationDirection(audCorr),
  });

  // 4. Graduation thresholds vs HOT rate
  const gradXs = enrichedCampaigns.map((c) => c.graduationThreshold);
  const hotYs = enrichedCampaigns.map((c) => c.hotRate);
  const gradCorr = calculateCorrelation(gradXs, hotYs);
  correlations.push({
    factor: "graduation_threshold_vs_hot_rate",
    xLabel: "Graduation Threshold",
    yLabel: "HOT! Rate",
    dataPoints: enrichedCampaigns.map((c) => ({
      campaignId: c.campaignId,
      title: c.title,
      x: c.graduationThreshold,
      y: Math.round(c.hotRate * 100) / 100,
    })),
    correlationStrength: Math.round(Math.abs(gradCorr) * 100) / 100,
    direction: getCorrelationDirection(gradCorr),
  });

  // 5. Coach enabled vs idea quality (participation rate as proxy)
  const coachXs = enrichedCampaigns.map((c) => (c.hasIdeaCoach ? 1 : 0));
  const coachCorr = calculateCorrelation(coachXs, partYs);
  correlations.push({
    factor: "coach_vs_participation",
    xLabel: "Idea Coach Enabled",
    yLabel: "Participation Rate",
    dataPoints: enrichedCampaigns.map((c) => ({
      campaignId: c.campaignId,
      title: c.title,
      x: c.hasIdeaCoach ? 1 : 0,
      y: Math.round(c.participationRate * 100) / 100,
    })),
    correlationStrength: Math.round(Math.abs(coachCorr) * 100) / 100,
    direction: getCorrelationDirection(coachCorr),
  });

  // Generate recommendations
  const recommendations = generateRecommendations(enrichedCampaigns);

  childLogger.info(
    { campaignCount: campaigns.length, correlationCount: correlations.length },
    "Success factor analysis generated",
  );

  return {
    correlations,
    recommendations,
    campaignCount: campaigns.length,
  };
}

// ── Recommendation Generator ─────────────────────────────────

interface EnrichedCampaign {
  campaignId: string;
  title: string;
  duration: number;
  participationRate: number;
  audienceSize: number;
  hotRate: number;
  evalQuality: number;
  votingCriteriaCount: number;
  graduationThreshold: number;
  hasIdeaCoach: boolean;
  averageVotes: number;
}

function generateRecommendations(campaigns: EnrichedCampaign[]): SuccessFactorRecommendation[] {
  const recommendations: SuccessFactorRecommendation[] = [];

  if (campaigns.length < 2) return recommendations;

  // Duration analysis
  const byParticipation = [...campaigns].sort((a, b) => b.participationRate - a.participationRate);
  const topHalf = byParticipation.slice(0, Math.ceil(campaigns.length / 2));
  const avgTopDuration = topHalf.reduce((s, c) => s + c.duration, 0) / topHalf.length;
  const avgAllDuration = campaigns.reduce((s, c) => s + c.duration, 0) / campaigns.length;

  if (Math.abs(avgTopDuration - avgAllDuration) > 5) {
    const durationRange = `${Math.round(Math.min(...topHalf.map((c) => c.duration)))}-${Math.round(Math.max(...topHalf.map((c) => c.duration)))} days`;
    recommendations.push({
      factor: "Campaign Duration",
      insight: `Top-performing campaigns averaged ${Math.round(avgTopDuration)} days compared to the overall average of ${Math.round(avgAllDuration)} days.`,
      recommendedRange: durationRange,
    });
  }

  // Coach analysis
  const withCoach = campaigns.filter((c) => c.hasIdeaCoach);
  const withoutCoach = campaigns.filter((c) => !c.hasIdeaCoach);
  if (withCoach.length > 0 && withoutCoach.length > 0) {
    const avgCoachPart = withCoach.reduce((s, c) => s + c.participationRate, 0) / withCoach.length;
    const avgNoCoachPart =
      withoutCoach.reduce((s, c) => s + c.participationRate, 0) / withoutCoach.length;

    if (avgCoachPart > avgNoCoachPart * 1.1) {
      const improvement = Math.round(
        ((avgCoachPart - avgNoCoachPart) / (avgNoCoachPart || 1)) * 100,
      );
      recommendations.push({
        factor: "Idea Coach",
        insight: `Campaigns with idea coaching enabled had ${improvement}% higher participation rates.`,
        recommendedRange: "Enabled",
      });
    }
  }

  // Audience size analysis
  const avgAudience = campaigns.reduce((s, c) => s + c.audienceSize, 0) / campaigns.length;
  const topAudiences = topHalf.map((c) => c.audienceSize);
  if (topAudiences.length > 0) {
    recommendations.push({
      factor: "Audience Size",
      insight: `Best-performing campaigns had an average audience of ${Math.round(topHalf.reduce((s, c) => s + c.audienceSize, 0) / topHalf.length)} members vs. overall ${Math.round(avgAudience)}.`,
      recommendedRange: `${Math.min(...topAudiences)}-${Math.max(...topAudiences)} members`,
    });
  }

  // Graduation threshold analysis
  const topGrad = topHalf.map((c) => c.graduationThreshold);
  if (topGrad.length > 0) {
    const avgTopGrad = topGrad.reduce((s, v) => s + v, 0) / topGrad.length;
    const avgAllGrad = campaigns.reduce((s, c) => s + c.graduationThreshold, 0) / campaigns.length;

    if (Math.abs(avgTopGrad - avgAllGrad) > 2) {
      recommendations.push({
        factor: "Graduation Threshold",
        insight: `Top campaigns used an aggregate graduation threshold of ~${Math.round(avgTopGrad)} vs. the overall average of ~${Math.round(avgAllGrad)}.`,
        recommendedRange: `${Math.min(...topGrad)}-${Math.max(...topGrad)} total points`,
      });
    }
  }

  return recommendations;
}

// ── Errors ───────────────────────────────────────────────────

export class CampaignComparisonError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "CampaignComparisonError";
  }
}
