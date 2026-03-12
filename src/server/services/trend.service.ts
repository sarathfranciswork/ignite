import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  TrendListInput,
  TrendCreateInput,
  TrendUpdateInput,
  TrendLinkSiaInput,
  TrendUnlinkSiaInput,
} from "./trend.schemas";

const childLogger = logger.child({ service: "trend" });

export class TrendServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "TrendServiceError";
  }
}

const trendInclude = {
  _count: {
    select: {
      children: true,
      sias: true,
      insights: true,
    },
  },
  parent: {
    select: { id: true, title: true, type: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

type TrendWithCounts = Prisma.TrendGetPayload<{
  include: typeof trendInclude;
}>;

function mapTrendToResponse(trend: TrendWithCounts) {
  return {
    id: trend.id,
    title: trend.title,
    description: trend.description,
    imageUrl: trend.imageUrl,
    sourceUrl: trend.sourceUrl,
    type: trend.type,
    isConfidential: trend.isConfidential,
    isArchived: trend.isArchived,
    isCommunitySubmitted: trend.isCommunitySubmitted,
    trendOneId: trend.trendOneId,
    businessRelevance: trend.businessRelevance,
    parentId: trend.parentId,
    parent: trend.parent,
    childCount: trend._count.children,
    siaCount: trend._count.sias,
    insightCount: trend._count.insights,
    createdBy: trend.createdBy,
    createdAt: trend.createdAt.toISOString(),
    updatedAt: trend.updatedAt.toISOString(),
  };
}

export async function listTrends(input: TrendListInput) {
  const where: Prisma.TrendWhereInput = {};

  if (input.type) {
    where.type = input.type;
  }

  if (input.isArchived !== undefined) {
    where.isArchived = input.isArchived;
  }

  if (input.isConfidential !== undefined) {
    where.isConfidential = input.isConfidential;
  }

  if (input.parentId !== undefined) {
    where.parentId = input.parentId;
  }

  if (input.siaId) {
    where.sias = {
      some: { siaId: input.siaId },
    };
  }

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "title";
  const sortDirection = input.sortDirection ?? "asc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.TrendOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.trend.findMany({
    where,
    include: trendInclude,
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
    items: items.map(mapTrendToResponse),
    nextCursor,
  };
}

export async function getTrendById(id: string) {
  const trend = await prisma.trend.findUnique({
    where: { id },
    include: {
      ...trendInclude,
      children: {
        select: {
          id: true,
          title: true,
          type: true,
          isArchived: true,
          businessRelevance: true,
        },
        orderBy: { title: "asc" },
      },
      sias: {
        include: {
          sia: {
            select: { id: true, name: true, color: true, isActive: true },
          },
        },
      },
      insights: {
        include: {
          insight: {
            select: { id: true, title: true, sourceUrl: true },
          },
        },
      },
    },
  });

  if (!trend) {
    throw new TrendServiceError("TREND_NOT_FOUND", "Trend not found");
  }

  return {
    ...mapTrendToResponse(trend),
    children: trend.children.map(
      (c: {
        id: string;
        title: string;
        type: string;
        isArchived: boolean;
        businessRelevance: number | null;
      }) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        isArchived: c.isArchived,
        businessRelevance: c.businessRelevance,
      }),
    ),
    sias: trend.sias.map(
      (link: { sia: { id: string; name: string; color: string | null; isActive: boolean } }) => ({
        id: link.sia.id,
        name: link.sia.name,
        color: link.sia.color,
        isActive: link.sia.isActive,
      }),
    ),
    insights: trend.insights.map(
      (link: { insight: { id: string; title: string; sourceUrl: string | null } }) => ({
        id: link.insight.id,
        title: link.insight.title,
        sourceUrl: link.insight.sourceUrl,
      }),
    ),
  };
}

export async function createTrend(input: TrendCreateInput, userId: string) {
  if (input.parentId) {
    const parent = await prisma.trend.findUnique({
      where: { id: input.parentId },
      select: { id: true, type: true },
    });
    if (!parent) {
      throw new TrendServiceError("PARENT_NOT_FOUND", "Parent trend not found");
    }
    validateHierarchy(parent.type, input.type);
  }

  const trend = await prisma.trend.create({
    data: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      sourceUrl: input.sourceUrl,
      type: input.type,
      isConfidential: input.isConfidential,
      isCommunitySubmitted: input.isCommunitySubmitted,
      trendOneId: input.trendOneId,
      businessRelevance: input.businessRelevance,
      parentId: input.parentId ?? undefined,
      createdById: userId,
    },
    include: trendInclude,
  });

  childLogger.info({ trendId: trend.id }, "Trend created");

  eventBus.emit("trend.created", {
    entity: "trend",
    entityId: trend.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: trend.title, type: trend.type },
  });

  return mapTrendToResponse(trend);
}

export async function updateTrend(input: TrendUpdateInput, userId: string) {
  const existing = await prisma.trend.findUnique({
    where: { id: input.id },
    select: { id: true, title: true, type: true, parentId: true },
  });

  if (!existing) {
    throw new TrendServiceError("TREND_NOT_FOUND", "Trend not found");
  }

  const { id, ...data } = input;
  const updateData: Prisma.TrendUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.isConfidential !== undefined) updateData.isConfidential = data.isConfidential;
  if (data.isCommunitySubmitted !== undefined)
    updateData.isCommunitySubmitted = data.isCommunitySubmitted;
  if (data.trendOneId !== undefined) updateData.trendOneId = data.trendOneId;
  if (data.businessRelevance !== undefined) updateData.businessRelevance = data.businessRelevance;

  if (data.parentId !== undefined) {
    if (data.parentId === null) {
      updateData.parent = { disconnect: true };
    } else {
      if (data.parentId === id) {
        throw new TrendServiceError("INVALID_PARENT", "A trend cannot be its own parent");
      }
      const parent = await prisma.trend.findUnique({
        where: { id: data.parentId },
        select: { id: true, type: true },
      });
      if (!parent) {
        throw new TrendServiceError("PARENT_NOT_FOUND", "Parent trend not found");
      }
      validateHierarchy(parent.type, data.type ?? existing.type);
      updateData.parent = { connect: { id: data.parentId } };
    }
  }

  const trend = await prisma.trend.update({
    where: { id },
    data: updateData,
    include: trendInclude,
  });

  childLogger.info({ trendId: trend.id }, "Trend updated");

  eventBus.emit("trend.updated", {
    entity: "trend",
    entityId: trend.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: trend.title },
  });

  return mapTrendToResponse(trend);
}

export async function archiveTrend(id: string, userId: string) {
  const existing = await prisma.trend.findUnique({
    where: { id },
    select: { id: true, title: true, isArchived: true },
  });

  if (!existing) {
    throw new TrendServiceError("TREND_NOT_FOUND", "Trend not found");
  }

  const newArchived = !existing.isArchived;

  const trend = await prisma.trend.update({
    where: { id },
    data: { isArchived: newArchived },
    include: trendInclude,
  });

  const eventName = newArchived ? "trend.archived" : "trend.unarchived";

  childLogger.info({ trendId: id, isArchived: newArchived }, "Trend archive toggled");

  eventBus.emit(eventName, {
    entity: "trend",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title, isArchived: newArchived },
  });

  return mapTrendToResponse(trend);
}

export async function deleteTrend(id: string, userId: string) {
  const existing = await prisma.trend.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      _count: { select: { children: true } },
    },
  });

  if (!existing) {
    throw new TrendServiceError("TREND_NOT_FOUND", "Trend not found");
  }

  if (existing._count.children > 0) {
    throw new TrendServiceError(
      "HAS_CHILDREN",
      "Cannot delete a trend that has child trends. Remove or reassign children first.",
    );
  }

  await prisma.trend.delete({ where: { id } });

  childLogger.info({ trendId: id }, "Trend deleted");

  eventBus.emit("trend.deleted", {
    entity: "trend",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title },
  });

  return { success: true };
}

export async function linkTrendToSia(input: TrendLinkSiaInput, userId: string) {
  const trend = await prisma.trend.findUnique({
    where: { id: input.trendId },
    select: { id: true, title: true },
  });

  if (!trend) {
    throw new TrendServiceError("TREND_NOT_FOUND", "Trend not found");
  }

  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id: input.siaId },
    select: { id: true, name: true },
  });

  if (!sia) {
    throw new TrendServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  const existingLink = await prisma.trendSiaLink.findUnique({
    where: {
      trendId_siaId: { trendId: input.trendId, siaId: input.siaId },
    },
  });

  if (existingLink) {
    return { success: true };
  }

  await prisma.trendSiaLink.create({
    data: {
      trendId: input.trendId,
      siaId: input.siaId,
    },
  });

  childLogger.info({ trendId: input.trendId, siaId: input.siaId }, "Trend linked to SIA");

  eventBus.emit("trend.siaLinked", {
    entity: "trend",
    entityId: input.trendId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: input.siaId, siaName: sia.name },
  });

  return { success: true };
}

export async function unlinkTrendFromSia(input: TrendUnlinkSiaInput, userId: string) {
  const existingLink = await prisma.trendSiaLink.findUnique({
    where: {
      trendId_siaId: { trendId: input.trendId, siaId: input.siaId },
    },
  });

  if (!existingLink) {
    return { success: true };
  }

  await prisma.trendSiaLink.delete({
    where: {
      trendId_siaId: { trendId: input.trendId, siaId: input.siaId },
    },
  });

  childLogger.info({ trendId: input.trendId, siaId: input.siaId }, "Trend unlinked from SIA");

  eventBus.emit("trend.siaUnlinked", {
    entity: "trend",
    entityId: input.trendId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: input.siaId },
  });

  return { success: true };
}

function validateHierarchy(parentType: string, childType: string) {
  const validChildren: Record<string, string[]> = {
    MEGA: ["MACRO", "MICRO"],
    MACRO: ["MICRO"],
    MICRO: [],
  };

  const allowed = validChildren[parentType];
  if (!allowed || !allowed.includes(childType)) {
    throw new TrendServiceError(
      "INVALID_HIERARCHY",
      `A ${childType} trend cannot be a child of a ${parentType} trend`,
    );
  }
}
