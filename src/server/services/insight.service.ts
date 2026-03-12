import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  InsightListInput,
  InsightCreateInput,
  InsightUpdateInput,
  InsightLinkTrendInput,
  InsightUnlinkTrendInput,
} from "./insight.schemas";

const childLogger = logger.child({ service: "insight" });

export class InsightServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "InsightServiceError";
  }
}

const insightInclude = {
  _count: {
    select: {
      trendLinks: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

type InsightWithCounts = Prisma.InsightGetPayload<{
  include: typeof insightInclude;
}>;

function mapInsightToResponse(insight: InsightWithCounts) {
  return {
    id: insight.id,
    title: insight.title,
    description: insight.description,
    type: insight.type,
    scope: insight.scope,
    sourceUrl: insight.sourceUrl,
    isEditorial: insight.isEditorial,
    isArchived: insight.isArchived,
    trendCount: insight._count.trendLinks,
    createdBy: insight.createdBy,
    createdAt: insight.createdAt.toISOString(),
    updatedAt: insight.updatedAt.toISOString(),
  };
}

export async function listInsights(input: InsightListInput) {
  const where: Prisma.InsightWhereInput = {};

  if (input.type) {
    where.type = input.type;
  }

  if (input.scope) {
    where.scope = input.scope;
  }

  if (input.isArchived !== undefined) {
    where.isArchived = input.isArchived;
  }

  if (input.trendId) {
    where.trendLinks = {
      some: { trendId: input.trendId },
    };
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "createdAt";
  const sortDirection = input.sortDirection ?? "desc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.InsightOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.insight.findMany({
    where,
    include: insightInclude,
    orderBy,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return {
    items: items.map(mapInsightToResponse),
    nextCursor,
  };
}

export async function getInsightById(id: string) {
  const insight = await prisma.insight.findUnique({
    where: { id },
    include: {
      ...insightInclude,
      trendLinks: {
        include: {
          trend: {
            select: { id: true, title: true, type: true },
          },
        },
      },
    },
  });

  if (!insight) {
    throw new InsightServiceError("INSIGHT_NOT_FOUND", "Insight not found");
  }

  return {
    ...mapInsightToResponse(insight),
    trends: insight.trendLinks.map(
      (link: { trend: { id: string; title: string; type: string } }) => ({
        id: link.trend.id,
        title: link.trend.title,
        type: link.trend.type,
      }),
    ),
  };
}

export async function createInsight(input: InsightCreateInput, userId: string) {
  const insight = await prisma.insight.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type ?? "SIGNAL",
      scope: input.scope ?? "GLOBAL",
      sourceUrl: input.sourceUrl,
      isEditorial: input.isEditorial,
      createdById: userId,
    },
    include: insightInclude,
  });

  childLogger.info({ insightId: insight.id }, "Insight created");

  eventBus.emit("insight.created", {
    entity: "insight",
    entityId: insight.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: insight.title, type: insight.type, scope: insight.scope },
  });

  return mapInsightToResponse(insight);
}

export async function updateInsight(input: InsightUpdateInput, userId: string) {
  const existing = await prisma.insight.findUnique({
    where: { id: input.id },
    select: { id: true, title: true },
  });

  if (!existing) {
    throw new InsightServiceError("INSIGHT_NOT_FOUND", "Insight not found");
  }

  const { id, ...data } = input;
  const updateData: Prisma.InsightUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.scope !== undefined) updateData.scope = data.scope;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;

  const insight = await prisma.insight.update({
    where: { id },
    data: updateData,
    include: insightInclude,
  });

  childLogger.info({ insightId: insight.id }, "Insight updated");

  eventBus.emit("insight.updated", {
    entity: "insight",
    entityId: insight.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: insight.title },
  });

  return mapInsightToResponse(insight);
}

export async function archiveInsight(id: string, userId: string) {
  const existing = await prisma.insight.findUnique({
    where: { id },
    select: { id: true, title: true, isArchived: true },
  });

  if (!existing) {
    throw new InsightServiceError("INSIGHT_NOT_FOUND", "Insight not found");
  }

  const newArchived = !existing.isArchived;

  const insight = await prisma.insight.update({
    where: { id },
    data: { isArchived: newArchived },
    include: insightInclude,
  });

  const eventName = newArchived ? "insight.archived" : "insight.unarchived";

  childLogger.info({ insightId: id, isArchived: newArchived }, "Insight archive toggled");

  eventBus.emit(eventName, {
    entity: "insight",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title, isArchived: newArchived },
  });

  return mapInsightToResponse(insight);
}

export async function deleteInsight(id: string, userId: string) {
  const existing = await prisma.insight.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!existing) {
    throw new InsightServiceError("INSIGHT_NOT_FOUND", "Insight not found");
  }

  await prisma.insight.delete({ where: { id } });

  childLogger.info({ insightId: id }, "Insight deleted");

  eventBus.emit("insight.deleted", {
    entity: "insight",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title },
  });

  return { success: true };
}

export async function linkInsightToTrend(input: InsightLinkTrendInput, userId: string) {
  const insight = await prisma.insight.findUnique({
    where: { id: input.insightId },
    select: { id: true, title: true },
  });

  if (!insight) {
    throw new InsightServiceError("INSIGHT_NOT_FOUND", "Insight not found");
  }

  const trend = await prisma.trend.findUnique({
    where: { id: input.trendId },
    select: { id: true, title: true },
  });

  if (!trend) {
    throw new InsightServiceError("TREND_NOT_FOUND", "Trend not found");
  }

  const existingLink = await prisma.trendInsightLink.findUnique({
    where: {
      trendId_insightId: { trendId: input.trendId, insightId: input.insightId },
    },
  });

  if (existingLink) {
    return { success: true };
  }

  await prisma.trendInsightLink.create({
    data: {
      trendId: input.trendId,
      insightId: input.insightId,
    },
  });

  childLogger.info(
    { insightId: input.insightId, trendId: input.trendId },
    "Insight linked to trend",
  );

  eventBus.emit("insight.trendLinked", {
    entity: "insight",
    entityId: input.insightId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { trendId: input.trendId, trendTitle: trend.title },
  });

  return { success: true };
}

export async function unlinkInsightFromTrend(input: InsightUnlinkTrendInput, userId: string) {
  const existingLink = await prisma.trendInsightLink.findUnique({
    where: {
      trendId_insightId: { trendId: input.trendId, insightId: input.insightId },
    },
  });

  if (!existingLink) {
    return { success: true };
  }

  await prisma.trendInsightLink.delete({
    where: {
      trendId_insightId: { trendId: input.trendId, insightId: input.insightId },
    },
  });

  childLogger.info(
    { insightId: input.insightId, trendId: input.trendId },
    "Insight unlinked from trend",
  );

  eventBus.emit("insight.trendUnlinked", {
    entity: "insight",
    entityId: input.insightId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { trendId: input.trendId },
  });

  return { success: true };
}
