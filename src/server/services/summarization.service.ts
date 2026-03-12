import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import { prisma } from "@/server/lib/prisma";
import {
  buildCampaignStats,
  buildEvaluationStats,
  generateCampaignSummary,
  generateEvaluationDigest,
  generateNotificationDigest,
} from "./summarization.helpers";
import type {
  CampaignSummaryResult,
  EvaluationSummaryResult,
  NotificationDigestResult,
} from "./summarization.schemas";

const childLogger = logger.child({ service: "summarization" });

export class SummarizationServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SummarizationServiceError";
  }
}

/**
 * Get the current summarization capability status.
 */
export function getSummarizationStatus(): {
  available: boolean;
  aiPowered: boolean;
  provider: string;
} {
  return {
    available: aiProvider.supportsTextGeneration(),
    aiPowered: aiProvider.supportsTextGeneration(),
    provider: aiProvider.name,
  };
}

/**
 * Summarize a campaign with engagement overview and top themes.
 * Returns null fields when AI is unavailable.
 */
export async function summarizeCampaign(campaignId: string): Promise<CampaignSummaryResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      launchedAt: true,
      closedAt: true,
    },
  });

  if (!campaign) {
    throw new SummarizationServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const emptyResult: CampaignSummaryResult = {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    engagementOverview: null,
    topThemes: [],
    aiPowered: false,
  };

  if (!aiProvider.supportsTextGeneration()) {
    return emptyResult;
  }

  const ideas = await prisma.idea.findMany({
    where: { campaignId },
    select: {
      title: true,
      teaser: true,
      status: true,
      tags: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
    },
  });

  if (ideas.length === 0) {
    return {
      ...emptyResult,
      engagementOverview: "No ideas have been submitted to this campaign yet.",
    };
  }

  const stats = buildCampaignStats(ideas);

  try {
    const aiResult = await generateCampaignSummary(campaign.title, campaign.status, stats);
    if (aiResult) {
      childLogger.info({ campaignId }, "Campaign summary generated via AI");
      return {
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        engagementOverview: aiResult.engagementOverview,
        topThemes: aiResult.topThemes,
        aiPowered: true,
      };
    }
  } catch (error) {
    childLogger.warn(
      { error: error instanceof Error ? error.message : String(error), campaignId },
      "AI campaign summarization failed",
    );
  }

  return emptyResult;
}

/**
 * Summarize an evaluation session with a results digest.
 * Returns null fields when AI is unavailable.
 */
export async function summarizeEvaluationSession(
  sessionId: string,
): Promise<EvaluationSummaryResult> {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      criteria: {
        select: { title: true, weight: true },
      },
      evaluators: {
        select: { userId: true },
      },
      ideas: {
        select: {
          idea: {
            select: { title: true },
          },
        },
      },
      responses: {
        select: {
          evaluatorId: true,
          scoreValue: true,
        },
      },
    },
  });

  if (!session) {
    throw new SummarizationServiceError("SESSION_NOT_FOUND", "Evaluation session not found");
  }

  const emptyResult: EvaluationSummaryResult = {
    sessionId: session.id,
    sessionTitle: session.title,
    resultsDigest: null,
    aiPowered: false,
  };

  if (!aiProvider.supportsTextGeneration()) {
    return emptyResult;
  }

  const respondedEvaluatorIds = new Set(session.responses.map((r) => r.evaluatorId));
  const evalStats = buildEvaluationStats({
    criteria: session.criteria,
    evaluatorCount: session.evaluators.length,
    respondedCount: respondedEvaluatorIds.size,
    ideas: session.ideas,
    responseCount: session.responses.length,
  });

  try {
    const digest = await generateEvaluationDigest(session.title, session.type, evalStats);
    if (digest) {
      childLogger.info({ sessionId }, "Evaluation summary generated via AI");
      return {
        sessionId: session.id,
        sessionTitle: session.title,
        resultsDigest: digest,
        aiPowered: true,
      };
    }
  } catch (error) {
    childLogger.warn(
      { error: error instanceof Error ? error.message : String(error), sessionId },
      "AI evaluation summarization failed",
    );
  }

  return emptyResult;
}

/**
 * Summarize recent notifications into a digest for a user.
 * Returns null when AI is unavailable.
 */
export async function summarizeNotificationDigest(
  userId: string,
  limit: number,
): Promise<NotificationDigestResult> {
  const emptyResult: NotificationDigestResult = {
    digest: null,
    notificationCount: 0,
    aiPowered: false,
  };

  if (!aiProvider.supportsTextGeneration()) {
    return emptyResult;
  }

  const notifications = await prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      type: true,
      title: true,
      body: true,
      createdAt: true,
    },
  });

  if (notifications.length === 0) {
    return {
      digest: "You have no unread notifications.",
      notificationCount: 0,
      aiPowered: false,
    };
  }

  try {
    const digest = await generateNotificationDigest(notifications);
    if (digest) {
      childLogger.info({ userId, count: notifications.length }, "Notification digest generated");
      return {
        digest,
        notificationCount: notifications.length,
        aiPowered: true,
      };
    }
  } catch (error) {
    childLogger.warn(
      { error: error instanceof Error ? error.message : String(error), userId },
      "AI notification digest failed",
    );
  }

  return { ...emptyResult, notificationCount: notifications.length };
}
