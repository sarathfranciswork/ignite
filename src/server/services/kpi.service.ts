import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { z } from "zod";

const childLogger = logger.child({ service: "kpi" });

export const campaignKpiInput = z.object({
  campaignId: z.string().cuid(),
});

export type CampaignKpiInput = z.infer<typeof campaignKpiInput>;

export interface CampaignKpi {
  campaignId: string;
  memberCount: number;
  // Idea funnel (real-time from campaign member counts until Idea model exists)
  ideasSubmitted: number;
  ideasQualified: number;
  ideasHot: number;
  ideasEvaluated: number;
  ideasSelected: number;
  // Activity counters
  totalComments: number;
  totalVotes: number;
  totalLikes: number;
  // Engagement rates
  awarenessRate: number;
  participationRate: number;
}

export interface KpiTimeSeriesPoint {
  date: string;
  ideasSubmitted: number;
  totalComments: number;
  totalVotes: number;
}

/**
 * Get real-time KPIs for a campaign.
 * Currently returns member-based metrics. Once Ideas are implemented,
 * this will aggregate actual idea/comment/vote counts.
 */
export async function getCampaignKpis(campaignId: string): Promise<CampaignKpi> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      _count: { select: { members: true } },
    },
  });

  if (!campaign) {
    throw new KpiServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const memberCount = campaign._count.members;

  // Until Ideas/Comments/Votes models exist, return zeros
  // The snapshot system will populate historical data via the daily job
  return {
    campaignId,
    memberCount,
    ideasSubmitted: 0,
    ideasQualified: 0,
    ideasHot: 0,
    ideasEvaluated: 0,
    ideasSelected: 0,
    totalComments: 0,
    totalVotes: 0,
    totalLikes: 0,
    awarenessRate: 0,
    participationRate: memberCount > 0 ? 100 : 0,
  };
}

/**
 * Get KPI time series from snapshots for activity chart.
 */
export async function getCampaignKpiTimeSeries(
  campaignId: string,
  days: number = 30,
): Promise<KpiTimeSeriesPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const snapshots = await prisma.campaignKpiSnapshot.findMany({
    where: {
      campaignId,
      snapshotDate: { gte: since },
    },
    orderBy: { snapshotDate: "asc" },
    select: {
      snapshotDate: true,
      ideasSubmitted: true,
      totalComments: true,
      totalVotes: true,
    },
  });

  return snapshots.map((s) => ({
    date: s.snapshotDate.toISOString().split("T")[0],
    ideasSubmitted: s.ideasSubmitted,
    totalComments: s.totalComments,
    totalVotes: s.totalVotes,
  }));
}

/**
 * Take a daily KPI snapshot for a campaign.
 * Called by the scheduled job.
 */
export async function takeCampaignKpiSnapshot(campaignId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const kpis = await getCampaignKpis(campaignId);

  await prisma.campaignKpiSnapshot.upsert({
    where: {
      campaignId_snapshotDate: {
        campaignId,
        snapshotDate: today,
      },
    },
    create: {
      campaignId,
      snapshotDate: today,
      totalParticipants: kpis.memberCount,
      ideasSubmitted: kpis.ideasSubmitted,
      ideasQualified: kpis.ideasQualified,
      ideasHot: kpis.ideasHot,
      ideasEvaluated: kpis.ideasEvaluated,
      ideasSelected: kpis.ideasSelected,
      totalComments: kpis.totalComments,
      totalVotes: kpis.totalVotes,
      totalLikes: kpis.totalLikes,
    },
    update: {
      totalParticipants: kpis.memberCount,
      ideasSubmitted: kpis.ideasSubmitted,
      ideasQualified: kpis.ideasQualified,
      ideasHot: kpis.ideasHot,
      ideasEvaluated: kpis.ideasEvaluated,
      ideasSelected: kpis.ideasSelected,
      totalComments: kpis.totalComments,
      totalVotes: kpis.totalVotes,
      totalLikes: kpis.totalLikes,
    },
  });

  childLogger.info({ campaignId, date: today.toISOString() }, "KPI snapshot taken");
}

export class KpiServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "KpiServiceError";
  }
}
