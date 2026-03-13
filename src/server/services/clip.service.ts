import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { ClipCreateInput, ClipListInput } from "./clip.schemas";

const childLogger = logger.child({ service: "clip" });

export class ClipServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ClipServiceError";
  }
}

/** Strip HTML tags from a string to sanitize excerpts. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Validate that a string looks like a valid URL. */
function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function createClip(input: ClipCreateInput, userId: string) {
  if (!isValidUrl(input.url)) {
    throw new ClipServiceError("INVALID_URL", "The provided URL is not valid");
  }

  const sanitizedExcerpt = input.excerpt ? stripHtml(input.excerpt) : undefined;

  if (input.type === "trend") {
    const trend = await prisma.trend.create({
      data: {
        title: input.title,
        description: sanitizedExcerpt,
        sourceUrl: input.url,
        imageUrl: input.imageUrl,
        type: "MICRO",
        isCommunitySubmitted: true,
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        createdAt: true,
      },
    });

    childLogger.info({ trendId: trend.id, clipUrl: input.url }, "Clip created as trend");

    eventBus.emit("clip.created", {
      entity: "trend",
      entityId: trend.id,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: { url: input.url, type: "trend" },
    });

    return {
      id: trend.id,
      type: "trend" as const,
      title: trend.title,
      url: trend.sourceUrl,
      createdAt: trend.createdAt.toISOString(),
      viewPath: `/strategy/trends`,
    };
  }

  if (input.type === "insight") {
    const insight = await prisma.insight.create({
      data: {
        title: input.title,
        description: sanitizedExcerpt,
        sourceUrl: input.url,
        type: "SIGNAL",
        scope: "GLOBAL",
        createdById: userId,
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        createdAt: true,
      },
    });

    childLogger.info({ insightId: insight.id, clipUrl: input.url }, "Clip created as insight");

    eventBus.emit("clip.created", {
      entity: "insight",
      entityId: insight.id,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: { url: input.url, type: "insight" },
    });

    return {
      id: insight.id,
      type: "insight" as const,
      title: insight.title,
      url: insight.sourceUrl,
      createdAt: insight.createdAt.toISOString(),
      viewPath: `/strategy/insights`,
    };
  }

  // type === "idea"
  if (!input.campaignId) {
    throw new ClipServiceError(
      "CAMPAIGN_REQUIRED",
      "A campaignId is required when clipping as an idea",
    );
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new ClipServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const description = [
    sanitizedExcerpt ? `${sanitizedExcerpt}\n\n` : "",
    `Source: ${input.url}`,
  ].join("");

  const idea = await prisma.idea.create({
    data: {
      title: input.title,
      description,
      status: "DRAFT",
      campaignId: input.campaignId,
      contributorId: userId,
      tags: input.tags ?? [],
    },
    select: {
      id: true,
      title: true,
      campaignId: true,
      createdAt: true,
    },
  });

  childLogger.info({ ideaId: idea.id, clipUrl: input.url }, "Clip created as idea draft");

  eventBus.emit("clip.created", {
    entity: "idea",
    entityId: idea.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { url: input.url, type: "idea", campaignId: input.campaignId },
  });

  return {
    id: idea.id,
    type: "idea" as const,
    title: idea.title,
    url: input.url,
    createdAt: idea.createdAt.toISOString(),
    viewPath: `/campaigns/${idea.campaignId}/ideas/${idea.id}`,
  };
}

export async function listClips(input: ClipListInput, userId: string) {
  const limit = input.limit ?? 20;

  // Gather recent trends, insights, and ideas created by this user
  // that have source URLs (i.e., were clipped from the web)
  const [trends, insights] = await Promise.all([
    prisma.trend.findMany({
      where: {
        createdById: userId,
        isCommunitySubmitted: true,
        sourceUrl: { not: null },
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.insight.findMany({
      where: {
        createdById: userId,
        sourceUrl: { not: null },
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  const items = [
    ...trends.map((t) => ({
      id: t.id,
      type: "trend" as const,
      title: t.title,
      url: t.sourceUrl,
      createdAt: t.createdAt.toISOString(),
    })),
    ...insights.map((i) => ({
      id: i.id,
      type: "insight" as const,
      title: i.title,
      url: i.sourceUrl,
      createdAt: i.createdAt.toISOString(),
    })),
  ];

  // Sort by createdAt descending and take limit
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    items: items.slice(0, limit),
  };
}
