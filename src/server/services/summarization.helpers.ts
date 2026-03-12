import { aiProvider } from "@/server/lib/ai/factory";
import { logger } from "@/server/lib/logger";

const childLogger = logger.child({ service: "summarization" });

// ── Campaign Helpers ──────────────────────────────────────────

export interface CampaignStats {
  ideaCount: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  statusDistribution: Record<string, number>;
  topTags: string[];
}

export function buildCampaignStats(
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

export async function generateCampaignSummary(
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

// ── Evaluation Helpers ────────────────────────────────────────

export interface EvaluationStats {
  criteriaCount: number;
  evaluatorCount: number;
  respondedCount: number;
  ideaCount: number;
  responseCount: number;
  criteriaNames: string[];
  ideaTitles: string[];
}

export function buildEvaluationStats(input: {
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

export async function generateEvaluationDigest(
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

// ── Notification Helpers ──────────────────────────────────────

export async function generateNotificationDigest(
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

// ── Shared Utilities ──────────────────────────────────────────

export function validateStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .slice(0, maxItems)
    .map((s) => s.slice(0, 200));
}
