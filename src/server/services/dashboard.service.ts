import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { DashboardOverviewInput } from "./dashboard.schemas";

export { dashboardOverviewInput } from "./dashboard.schemas";
export type { DashboardOverviewInput } from "./dashboard.schemas";

const childLogger = logger.child({ service: "dashboard" });

export class DashboardServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DashboardServiceError";
  }
}

// ── Types ────────────────────────────────────────────────────

interface PendingEvaluation {
  sessionId: string;
  sessionTitle: string;
  sessionType: string;
  campaignId: string;
  campaignTitle: string;
  dueDate: string | null;
  ideaCount: number;
  respondedCount: number;
}

interface ActiveCampaign {
  id: string;
  title: string;
  status: string;
  role: string;
  ideaCount: number;
  memberCount: number;
  submissionCloseDate: string | null;
}

interface RecentIdea {
  id: string;
  title: string;
  status: string;
  campaignId: string;
  campaignTitle: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  ideaId: string;
  campaignId: string;
  actorId: string;
  eventType: string;
  title: string;
  body: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface PlatformKpis {
  activeCampaigns: number;
  totalIdeas: number;
  totalUsers: number;
  pendingEvaluations: number;
}

export interface DashboardOverview {
  pendingEvaluations: PendingEvaluation[];
  activeCampaigns: ActiveCampaign[];
  recentIdeas: RecentIdea[];
  activityFeed: { items: ActivityItem[]; nextCursor: string | undefined };
  platformKpis: PlatformKpis | null;
  userRole: string;
}

// ── Service Functions ────────────────────────────────────────

/**
 * Get pending evaluations for the current user.
 */
export async function getPendingEvaluations(userId: string): Promise<PendingEvaluation[]> {
  const evaluatorAssignments = await prisma.evaluationSessionEvaluator.findMany({
    where: { userId },
    select: {
      session: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          dueDate: true,
          campaignId: true,
          campaign: { select: { id: true, title: true } },
          _count: { select: { ideas: true } },
        },
      },
    },
  });

  const activeSessions = evaluatorAssignments
    .map((a) => a.session)
    .filter((s) => s.status === "ACTIVE");

  const results: PendingEvaluation[] = [];

  for (const session of activeSessions) {
    const respondedCount = await prisma.evaluationResponse.count({
      where: {
        sessionId: session.id,
        evaluatorId: userId,
      },
    });

    const totalIdeas = session._count.ideas;

    if (respondedCount < totalIdeas) {
      results.push({
        sessionId: session.id,
        sessionTitle: session.title,
        sessionType: session.type,
        campaignId: session.campaign.id,
        campaignTitle: session.campaign.title,
        dueDate: session.dueDate?.toISOString() ?? null,
        ideaCount: totalIdeas,
        respondedCount,
      });
    }
  }

  return results;
}

/**
 * Get active campaigns the user is involved in.
 */
export async function getActiveCampaigns(userId: string): Promise<ActiveCampaign[]> {
  const memberships = await prisma.campaignMember.findMany({
    where: { userId },
    select: {
      role: true,
      campaign: {
        select: {
          id: true,
          title: true,
          status: true,
          submissionCloseDate: true,
          _count: {
            select: {
              ideas: true,
              members: true,
            },
          },
        },
      },
    },
  });

  return memberships
    .filter((m) => m.campaign.status !== "DRAFT" && m.campaign.status !== "CLOSED")
    .map((m) => ({
      id: m.campaign.id,
      title: m.campaign.title,
      status: m.campaign.status,
      role: m.role,
      ideaCount: m.campaign._count.ideas,
      memberCount: m.campaign._count.members,
      submissionCloseDate: m.campaign.submissionCloseDate?.toISOString() ?? null,
    }));
}

/**
 * Get recent ideas contributed by the user.
 */
export async function getRecentIdeas(userId: string): Promise<RecentIdea[]> {
  const ideas = await prisma.idea.findMany({
    where: { contributorId: userId },
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      campaignId: true,
      campaign: { select: { title: true } },
      createdAt: true,
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  return ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    status: idea.status,
    campaignId: idea.campaignId,
    campaignTitle: idea.campaign.title,
    likesCount: idea._count.likes,
    commentsCount: idea._count.comments,
    createdAt: idea.createdAt.toISOString(),
  }));
}

/**
 * Get recent activity feed across all campaigns the user is in.
 */
export async function getActivityFeed(
  userId: string,
  limit: number,
  cursor?: string,
): Promise<{ items: ActivityItem[]; nextCursor: string | undefined }> {
  const memberCampaignIds = await prisma.campaignMember.findMany({
    where: { userId },
    select: { campaignId: true },
  });

  const campaignIds = memberCampaignIds.map((m) => m.campaignId);

  if (campaignIds.length === 0) {
    return { items: [], nextCursor: undefined };
  }

  const events = await prisma.activityEvent.findMany({
    where: { campaignId: { in: campaignIds } },
    include: {
      actor: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (events.length > limit) {
    const next = events.pop();
    nextCursor = next?.id;
  }

  return {
    items: events.map((e) => ({
      id: e.id,
      ideaId: e.ideaId,
      campaignId: e.campaignId,
      actorId: e.actorId,
      eventType: e.eventType,
      title: e.title,
      body: e.body,
      createdAt: e.createdAt.toISOString(),
      actor: e.actor,
    })),
    nextCursor,
  };
}

/**
 * Get platform-wide KPIs (for Innovation Managers / Platform Admins).
 */
export async function getPlatformKpis(): Promise<PlatformKpis> {
  const [activeCampaigns, totalIdeas, totalUsers, pendingEvaluations] = await Promise.all([
    prisma.campaign.count({
      where: { status: { notIn: ["DRAFT", "CLOSED"] } },
    }),
    prisma.idea.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.evaluationSession.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    activeCampaigns,
    totalIdeas,
    totalUsers,
    pendingEvaluations,
  };
}

/**
 * Get the full dashboard overview for a user.
 * Role-adaptive: managers get platform KPIs; contributors see their ideas.
 */
export async function getDashboardOverview(
  userId: string,
  globalRole: string,
  input: DashboardOverviewInput,
): Promise<DashboardOverview> {
  const isManager = globalRole === "PLATFORM_ADMIN" || globalRole === "INNOVATION_MANAGER";

  const [pendingEvals, activeCampaignsData, recentIdeasData, activityData, kpis] =
    await Promise.all([
      getPendingEvaluations(userId),
      getActiveCampaigns(userId),
      getRecentIdeas(userId),
      getActivityFeed(userId, input.activityLimit, input.activityCursor),
      isManager ? getPlatformKpis() : Promise.resolve(null),
    ]);

  childLogger.info(
    {
      userId,
      globalRole,
      pendingEvaluations: pendingEvals.length,
      activeCampaigns: activeCampaignsData.length,
    },
    "Dashboard overview loaded",
  );

  return {
    pendingEvaluations: pendingEvals,
    activeCampaigns: activeCampaignsData,
    recentIdeas: recentIdeasData,
    activityFeed: activityData,
    platformKpis: kpis,
    userRole: globalRole,
  };
}
