import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";
import { prisma } from "@/server/lib/prisma";
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

// ── Internal Helpers ──────────────────────────────────────────

interface CampaignStats {
  ideaCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  statusDistribution: Record<string, number>;
  topTags: string[];
}

function buildCampaignStats(
  ideas: {
    title: string;
    teaser: string | null;
    status: string;
    tags: string[];
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
  }[],
): CampaignStats {
  const statusDistribution: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  let totalLikes = 0;
  let totalComments = 0;
  let totalViews = 0;

  for (const idea of ideas) {
    statusDistribution[idea.status] = (statusDistribution[idea.status] ?? 0) + 1;
    totalLikes += idea.likesCount;
    totalComments += idea.commentsCount;
    totalViews += idea.viewsCount;
    for (const tag of idea.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  return {
    ideaCount: ideas.length,
    totalLikes,
    totalComments,
    totalViews,
    statusDistribution,
    topTags,
  };
}

async function generateCampaignSummary(
  title: string,
  status: string,
  stats: CampaignStats,
): Promise<{ engagementOverview: string; topThemes: string[] } | null> {
  const systemPrompt = `You are an innovation platform assistant that summarizes campaign engagement.
Return only raw JSON, no markdown code fences.

Response format:
{
  "engagementOverview": "A 2-3 sentence overview of campaign engagement and activity.",
  "topThemes": ["theme1", "theme2", "theme3"]
}

Rules:
- engagementOverview should mention key metrics (ideas, likes, comments, views)
- topThemes should list 3-5 dominant themes based on tags and idea distribution
- Keep the overview concise and informative
- Be factual, not promotional`;

  const prompt = `Summarize this innovation campaign:

Campaign: ${title}
Status: ${status}
Ideas submitted: ${stats.ideaCount}
Total likes: ${stats.totalLikes}
Total comments: ${stats.totalComments}
Total views: ${stats.totalViews}
Status distribution: ${JSON.stringify(stats.statusDistribution)}
Top tags: ${stats.topTags.join(", ")}`;

  const result = await aiProvider.generateText(prompt, systemPrompt);
  if (!result || !result.text || result.finishReason === "error") {
    return null;
  }

  try {
    const parsed = JSON.parse(result.text) as {
      engagementOverview?: unknown;
      topThemes?: unknown;
    };

    const engagementOverview =
      typeof parsed.engagementOverview === "string"
        ? parsed.engagementOverview.slice(0, 1000)
        : null;

    const topThemes = validateStringArray(parsed.topThemes, 5);

    if (!engagementOverview) return null;

    return { engagementOverview, topThemes };
  } catch (error) {
    childLogger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to parse AI campaign summary response",
    );
    return null;
  }
}

interface EvaluationStats {
  criteriaCount: number;
  evaluatorCount: number;
  respondedCount: number;
  ideaCount: number;
  responseCount: number;
  criteriaNames: string[];
  ideaTitles: string[];
}

function buildEvaluationStats(input: {
  criteria: { title: string; weight: number }[];
  evaluatorCount: number;
  respondedCount: number;
  ideas: { idea: { title: string } }[];
  responseCount: number;
}): EvaluationStats {
  return {
    criteriaCount: input.criteria.length,
    evaluatorCount: input.evaluatorCount,
    respondedCount: input.respondedCount,
    ideaCount: input.ideas.length,
    responseCount: input.responseCount,
    criteriaNames: input.criteria.map((c) => c.title),
    ideaTitles: input.ideas.map((i) => i.idea.title).slice(0, 20),
  };
}

async function generateEvaluationDigest(
  title: string,
  type: string,
  stats: EvaluationStats,
): Promise<string | null> {
  const systemPrompt = `You are an innovation platform assistant that summarizes evaluation sessions.
Return only a plain text paragraph (2-4 sentences), no JSON, no markdown.

Rules:
- Mention participation rate (responded vs total evaluators)
- Note the evaluation type and number of ideas evaluated
- Mention criteria used
- Keep it factual and concise`;

  const prompt = `Summarize this evaluation session:

Session: ${title}
Type: ${type}
Criteria (${stats.criteriaCount}): ${stats.criteriaNames.join(", ")}
Evaluators: ${stats.respondedCount} of ${stats.evaluatorCount} responded
Ideas evaluated: ${stats.ideaCount}
Total responses: ${stats.responseCount}
Ideas: ${stats.ideaTitles.join(", ")}`;

  const result = await aiProvider.generateText(prompt, systemPrompt);
  if (!result || !result.text || result.finishReason === "error") {
    return null;
  }

  return result.text.slice(0, 2000);
}

async function generateNotificationDigest(
  notifications: { type: string; title: string; body: string; createdAt: Date }[],
): Promise<string | null> {
  const systemPrompt = `You are an innovation platform assistant that creates notification digests.
Return only a plain text summary (2-4 sentences), no JSON, no markdown.

Rules:
- Group related notifications by type
- Highlight the most important items
- Keep it brief and actionable
- Do not list every notification — summarize patterns`;

  const notificationLines = notifications
    .slice(0, 20)
    .map((n) => `[${n.type}] ${n.title}: ${n.body.slice(0, 100)}`)
    .join("\n");

  const prompt = `Summarize these ${notifications.length} unread notifications into a brief digest:\n\n${notificationLines}`;

  const result = await aiProvider.generateText(prompt, systemPrompt);
  if (!result || !result.text || result.finishReason === "error") {
    return null;
  }

  return result.text.slice(0, 2000);
}

function validateStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .slice(0, maxItems)
    .map((s) => s.slice(0, 200));
}
