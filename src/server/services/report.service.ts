import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { IdeaStatus } from "@prisma/client";
import type {
  CampaignOverviewInput,
  PortfolioAnalysisInput,
  IdeaFunnelInput,
  PlatformSummaryInput,
} from "./report.schemas";

const childLogger = logger.child({ service: "report" });

export class ReportServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReportServiceError";
  }
}

// ── Types ────────────────────────────────────────────────────

interface CampaignOverviewResult {
  campaign: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  };
  memberCount: number;
  ideaCount: number;
  ideaStatusBreakdown: Record<string, number>;
  engagementMetrics: {
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
  };
  kpiTimeSeries: Array<{
    date: string;
    ideasSubmitted: number;
    totalComments: number;
    totalVotes: number;
  }>;
}

interface ProjectByProcess {
  processDefinition: {
    id: string;
    name: string;
  };
  totalProjects: number;
  statusBreakdown: Record<string, number>;
  phaseDistribution: Array<{
    phaseName: string;
    projectCount: number;
  }>;
}

interface IdeaFunnelResult {
  campaignId: string;
  campaignTitle: string;
  funnel: Array<{
    status: string;
    count: number;
  }>;
  totalIdeas: number;
}

interface PlatformSummaryResult {
  totalCampaigns: number;
  activeCampaigns: number;
  totalIdeas: number;
  totalProjects: number;
  totalUsers: number;
  campaignStatusBreakdown: Record<string, number>;
  projectStatusBreakdown: Record<string, number>;
  topCampaigns: Array<{
    id: string;
    title: string;
    status: string;
    ideaCount: number;
    memberCount: number;
  }>;
}

// ── Service Functions ────────────────────────────────────────

export async function getCampaignOverview(
  input: CampaignOverviewInput,
): Promise<CampaignOverviewResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      _count: {
        select: { members: true, ideas: true },
      },
    },
  });

  if (!campaign) {
    throw new ReportServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const ideas = await prisma.idea.groupBy({
    by: ["status"],
    where: { campaignId: input.campaignId },
    _count: { id: true },
  });

  const ideaStatusBreakdown: Record<string, number> = {};
  for (const group of ideas) {
    ideaStatusBreakdown[group.status] = group._count.id;
  }

  const engagementAgg = await prisma.idea.aggregate({
    where: { campaignId: input.campaignId },
    _sum: {
      likesCount: true,
      commentsCount: true,
    },
  });

  const voteCount = await prisma.ideaVote.count({
    where: { idea: { campaignId: input.campaignId } },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const snapshots = await prisma.campaignKpiSnapshot.findMany({
    where: {
      campaignId: input.campaignId,
      snapshotDate: { gte: thirtyDaysAgo },
    },
    orderBy: { snapshotDate: "asc" },
    select: {
      snapshotDate: true,
      ideasSubmitted: true,
      totalComments: true,
      totalVotes: true,
    },
  });

  childLogger.info({ campaignId: input.campaignId }, "Campaign overview report generated");

  return {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      createdAt: campaign.createdAt.toISOString(),
    },
    memberCount: campaign._count.members,
    ideaCount: campaign._count.ideas,
    ideaStatusBreakdown,
    engagementMetrics: {
      totalLikes: engagementAgg._sum.likesCount ?? 0,
      totalComments: engagementAgg._sum.commentsCount ?? 0,
      totalVotes: voteCount,
    },
    kpiTimeSeries: snapshots.map((s) => ({
      date: s.snapshotDate.toISOString().split("T")[0] ?? "",
      ideasSubmitted: s.ideasSubmitted,
      totalComments: s.totalComments,
      totalVotes: s.totalVotes,
    })),
  };
}

export async function getPortfolioAnalysis(
  input: PortfolioAnalysisInput,
): Promise<ProjectByProcess[]> {
  const projectWhere: Record<string, unknown> = {};
  if (input.processDefinitionId) {
    projectWhere.processDefinitionId = input.processDefinitionId;
  }
  if (input.status) {
    projectWhere.status = input.status;
  }

  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: {
      id: true,
      status: true,
      processDefinitionId: true,
      processDefinition: {
        select: { id: true, name: true },
      },
      currentPhase: {
        select: { id: true, name: true },
      },
    },
  });

  const grouped = new Map<
    string,
    {
      processDefinition: { id: string; name: string };
      projects: Array<{ status: string; phaseName: string | null }>;
    }
  >();

  for (const project of projects) {
    const pdId = project.processDefinitionId;
    if (!grouped.has(pdId)) {
      grouped.set(pdId, {
        processDefinition: project.processDefinition,
        projects: [],
      });
    }
    grouped.get(pdId)!.projects.push({
      status: project.status,
      phaseName: project.currentPhase?.name ?? null,
    });
  }

  const results: ProjectByProcess[] = [];

  for (const [, group] of grouped) {
    const statusBreakdown: Record<string, number> = {};
    const phaseMap = new Map<string, number>();

    for (const p of group.projects) {
      statusBreakdown[p.status] = (statusBreakdown[p.status] ?? 0) + 1;
      if (p.phaseName) {
        phaseMap.set(p.phaseName, (phaseMap.get(p.phaseName) ?? 0) + 1);
      }
    }

    results.push({
      processDefinition: group.processDefinition,
      totalProjects: group.projects.length,
      statusBreakdown,
      phaseDistribution: Array.from(phaseMap.entries()).map(([phaseName, projectCount]) => ({
        phaseName,
        projectCount,
      })),
    });
  }

  childLogger.info(
    { processDefinitionId: input.processDefinitionId, resultCount: results.length },
    "Portfolio analysis report generated",
  );

  return results;
}

export async function getIdeaFunnel(input: IdeaFunnelInput): Promise<IdeaFunnelResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new ReportServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const statusGroups = await prisma.idea.groupBy({
    by: ["status"],
    where: { campaignId: input.campaignId },
    _count: { id: true },
  });

  const statusOrder: IdeaStatus[] = [
    IdeaStatus.DRAFT,
    IdeaStatus.QUALIFICATION,
    IdeaStatus.COMMUNITY_DISCUSSION,
    IdeaStatus.HOT,
    IdeaStatus.EVALUATION,
    IdeaStatus.SELECTED_IMPLEMENTATION,
    IdeaStatus.IMPLEMENTED,
    IdeaStatus.ARCHIVED,
  ];

  const statusMap = new Map(statusGroups.map((g) => [g.status, g._count.id]));

  const funnel = statusOrder.map((status) => ({
    status,
    count: statusMap.get(status) ?? 0,
  }));

  const totalIdeas = statusGroups.reduce((sum, g) => sum + g._count.id, 0);

  childLogger.info({ campaignId: input.campaignId }, "Idea funnel report generated");

  return {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    funnel,
    totalIdeas,
  };
}

export async function getPlatformSummary(
  input: PlatformSummaryInput,
): Promise<PlatformSummaryResult> {
  const dateFilter = input.dateRange?.from
    ? {
        createdAt: {
          ...(input.dateRange.from ? { gte: new Date(input.dateRange.from) } : {}),
          ...(input.dateRange.to ? { lte: new Date(input.dateRange.to) } : {}),
        },
      }
    : {};

  const [totalCampaigns, activeCampaigns, totalIdeas, totalProjects, totalUsers] =
    await Promise.all([
      prisma.campaign.count({ where: dateFilter }),
      prisma.campaign.count({
        where: { ...dateFilter, status: { notIn: ["DRAFT", "CLOSED"] } },
      }),
      prisma.idea.count({ where: dateFilter }),
      prisma.project.count({ where: dateFilter }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

  const campaignStatusGroups = await prisma.campaign.groupBy({
    by: ["status"],
    where: dateFilter,
    _count: { id: true },
  });

  const campaignStatusBreakdown: Record<string, number> = {};
  for (const group of campaignStatusGroups) {
    campaignStatusBreakdown[group.status] = group._count.id;
  }

  const projectStatusGroups = await prisma.project.groupBy({
    by: ["status"],
    where: dateFilter,
    _count: { id: true },
  });

  const projectStatusBreakdown: Record<string, number> = {};
  for (const group of projectStatusGroups) {
    projectStatusBreakdown[group.status] = group._count.id;
  }

  const topCampaigns = await prisma.campaign.findMany({
    where: { ...dateFilter, status: { notIn: ["DRAFT"] } },
    select: {
      id: true,
      title: true,
      status: true,
      _count: {
        select: { ideas: true, members: true },
      },
    },
    orderBy: { ideas: { _count: "desc" } },
    take: 10,
  });

  childLogger.info("Platform summary report generated");

  return {
    totalCampaigns,
    activeCampaigns,
    totalIdeas,
    totalProjects,
    totalUsers,
    campaignStatusBreakdown,
    projectStatusBreakdown,
    topCampaigns: topCampaigns.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      ideaCount: c._count.ideas,
      memberCount: c._count.members,
    })),
  };
}
