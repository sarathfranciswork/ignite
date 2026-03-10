import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { format, subDays, startOfDay } from "date-fns";
import type { CockpitGetInput, CockpitActivityInput, CockpitExportInput } from "./kpi.schemas";

export { cockpitGetInput, cockpitActivityInput, cockpitExportInput } from "./kpi.schemas";

export type { CockpitGetInput, CockpitActivityInput, CockpitExportInput } from "./kpi.schemas";

const childLogger = logger.child({ service: "kpi" });

export interface KpiSummary {
  invitedCount: number;
  browsedCount: number;
  participantCount: number;
  ideaCount: number;
  commentCount: number;
  voteCount: number;
  likeCount: number;
  awarenessRate: number;
  participationRate: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
}

export interface ActivityDataPoint {
  date: string;
  ideas: number;
  comments: number;
  votes: number;
}

export interface CockpitData {
  kpis: KpiSummary;
  funnel: FunnelStep[];
}

export interface ExportRow {
  date: string;
  invitedCount: number;
  browsedCount: number;
  participantCount: number;
  ideaCount: number;
  commentCount: number;
  voteCount: number;
  likeCount: number;
  submittedCount: number;
  qualifiedCount: number;
  hotCount: number;
  evaluatedCount: number;
  selectedCount: number;
}

/**
 * Get cockpit KPI summary and funnel for a campaign.
 * Uses the latest KPI snapshot for pre-aggregated data.
 * Falls back to lightweight real-time counters if no snapshot exists.
 */
export async function getCampaignCockpit(input: CockpitGetInput): Promise<CockpitData> {
  const { campaignId } = input;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new KpiServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const latestSnapshot = await prisma.kpiSnapshot.findFirst({
    where: { campaignId },
    orderBy: { snapshotDate: "desc" },
  });

  if (latestSnapshot) {
    const awarenessRate =
      latestSnapshot.invitedCount > 0
        ? Math.round((latestSnapshot.browsedCount / latestSnapshot.invitedCount) * 100)
        : 0;
    const participationRate =
      latestSnapshot.invitedCount > 0
        ? Math.round((latestSnapshot.participantCount / latestSnapshot.invitedCount) * 100)
        : 0;

    return {
      kpis: {
        invitedCount: latestSnapshot.invitedCount,
        browsedCount: latestSnapshot.browsedCount,
        participantCount: latestSnapshot.participantCount,
        ideaCount: latestSnapshot.ideaCount,
        commentCount: latestSnapshot.commentCount,
        voteCount: latestSnapshot.voteCount,
        likeCount: latestSnapshot.likeCount,
        awarenessRate,
        participationRate,
      },
      funnel: buildFunnel(latestSnapshot),
    };
  }

  // Fallback: real-time counters from member table
  const memberCount = await prisma.campaignMember.count({
    where: { campaignId },
  });

  childLogger.info({ campaignId }, "No snapshot found, returning real-time counters");

  return {
    kpis: {
      invitedCount: memberCount,
      browsedCount: 0,
      participantCount: 0,
      ideaCount: 0,
      commentCount: 0,
      voteCount: 0,
      likeCount: 0,
      awarenessRate: 0,
      participationRate: 0,
    },
    funnel: [
      { stage: "Submitted", count: 0 },
      { stage: "Qualified", count: 0 },
      { stage: "HOT", count: 0 },
      { stage: "Evaluated", count: 0 },
      { stage: "Selected", count: 0 },
    ],
  };
}

/**
 * Get activity data over time for the activity chart.
 * Returns daily aggregated data points from KPI snapshots.
 */
export async function getCampaignActivity(
  input: CockpitActivityInput,
): Promise<ActivityDataPoint[]> {
  const { campaignId, days } = input;

  const since = startOfDay(subDays(new Date(), days));

  const snapshots = await prisma.kpiSnapshot.findMany({
    where: {
      campaignId,
      snapshotDate: { gte: since },
    },
    orderBy: { snapshotDate: "asc" },
    select: {
      snapshotDate: true,
      ideaCount: true,
      commentCount: true,
      voteCount: true,
    },
  });

  if (snapshots.length === 0) {
    return [];
  }

  // Convert snapshots to daily deltas (difference between consecutive days)
  const dataPoints: ActivityDataPoint[] = [];
  for (let i = 0; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = i > 0 ? snapshots[i - 1] : undefined;

    dataPoints.push({
      date: format(current.snapshotDate, "yyyy-MM-dd"),
      ideas: previous ? Math.max(0, current.ideaCount - previous.ideaCount) : current.ideaCount,
      comments: previous
        ? Math.max(0, current.commentCount - previous.commentCount)
        : current.commentCount,
      votes: previous ? Math.max(0, current.voteCount - previous.voteCount) : current.voteCount,
    });
  }

  return dataPoints;
}

/**
 * Export cockpit data as an array of rows (for CSV/Excel conversion on client).
 */
export async function exportCockpitData(input: CockpitExportInput): Promise<ExportRow[]> {
  const { campaignId } = input;

  const snapshots = await prisma.kpiSnapshot.findMany({
    where: { campaignId },
    orderBy: { snapshotDate: "asc" },
  });

  return snapshots.map((s) => ({
    date: format(s.snapshotDate, "yyyy-MM-dd"),
    invitedCount: s.invitedCount,
    browsedCount: s.browsedCount,
    participantCount: s.participantCount,
    ideaCount: s.ideaCount,
    commentCount: s.commentCount,
    voteCount: s.voteCount,
    likeCount: s.likeCount,
    submittedCount: s.submittedCount,
    qualifiedCount: s.qualifiedCount,
    hotCount: s.hotCount,
    evaluatedCount: s.evaluatedCount,
    selectedCount: s.selectedCount,
  }));
}

/**
 * Create a KPI snapshot for a campaign.
 * Called by the daily BullMQ job processor.
 */
export async function createKpiSnapshot(campaignId: string): Promise<void> {
  const today = startOfDay(new Date());

  // Count campaign members as "invited"
  const invitedCount = await prisma.campaignMember.count({
    where: { campaignId },
  });

  // For now, we use member counts as proxies until Idea model is available.
  // When Idea, Comment, Vote models are added in future stories,
  // these queries will be updated to count real data.
  const snapshot = await prisma.kpiSnapshot.upsert({
    where: {
      campaignId_snapshotDate: {
        campaignId,
        snapshotDate: today,
      },
    },
    update: {
      invitedCount,
      // Future: update with real idea/comment/vote counts
    },
    create: {
      campaignId,
      snapshotDate: today,
      invitedCount,
      browsedCount: 0,
      participantCount: 0,
      ideaCount: 0,
      commentCount: 0,
      voteCount: 0,
      likeCount: 0,
      submittedCount: 0,
      qualifiedCount: 0,
      hotCount: 0,
      evaluatedCount: 0,
      selectedCount: 0,
    },
  });

  eventBus.emit("kpi.snapshotCreated", {
    entity: "kpiSnapshot",
    entityId: snapshot.id,
    actor: "system:kpi-snapshot",
    timestamp: new Date().toISOString(),
    metadata: { campaignId, snapshotDate: format(today, "yyyy-MM-dd") },
  });

  childLogger.info({ campaignId, snapshotId: snapshot.id }, "KPI snapshot created");
}

function buildFunnel(snapshot: {
  submittedCount: number;
  qualifiedCount: number;
  hotCount: number;
  evaluatedCount: number;
  selectedCount: number;
}): FunnelStep[] {
  return [
    { stage: "Submitted", count: snapshot.submittedCount },
    { stage: "Qualified", count: snapshot.qualifiedCount },
    { stage: "HOT", count: snapshot.hotCount },
    { stage: "Evaluated", count: snapshot.evaluatedCount },
    { stage: "Selected", count: snapshot.selectedCount },
  ];
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
