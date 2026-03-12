import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma, PortfolioItemType } from "@prisma/client";
import type {
  PortfolioListInput,
  PortfolioCreateInput,
  PortfolioUpdateInput,
  PortfolioAddItemInput,
  PortfolioRemoveItemInput,
  PortfolioReorderItemsInput,
} from "./portfolio.schemas";

const childLogger = logger.child({ service: "portfolio" });

export class PortfolioServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "PortfolioServiceError";
  }
}

const portfolioInclude = {
  _count: {
    select: {
      items: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

type PortfolioWithCounts = Prisma.InnovationPortfolioGetPayload<{
  include: typeof portfolioInclude;
}>;

function mapPortfolioToResponse(portfolio: PortfolioWithCounts) {
  return {
    id: portfolio.id,
    title: portfolio.title,
    description: portfolio.description,
    itemCount: portfolio._count.items,
    createdBy: portfolio.createdBy,
    createdAt: portfolio.createdAt.toISOString(),
    updatedAt: portfolio.updatedAt.toISOString(),
  };
}

export async function listPortfolios(input: PortfolioListInput) {
  const where: Prisma.InnovationPortfolioWhereInput = {};

  if (input.search) {
    where.OR = [
      { title: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "updatedAt";
  const sortDirection = input.sortDirection ?? "desc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.InnovationPortfolioOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.innovationPortfolio.findMany({
    where,
    include: portfolioInclude,
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
    items: items.map(mapPortfolioToResponse),
    nextCursor,
  };
}

export async function getPortfolioById(id: string) {
  const portfolio = await prisma.innovationPortfolio.findUnique({
    where: { id },
    include: {
      ...portfolioInclude,
      items: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!portfolio) {
    throw new PortfolioServiceError("PORTFOLIO_NOT_FOUND", "Innovation Portfolio not found");
  }

  const enrichedItems = await enrichPortfolioItems(portfolio.items);

  return {
    ...mapPortfolioToResponse(portfolio),
    items: enrichedItems,
  };
}

interface PortfolioItemRecord {
  id: string;
  entityType: PortfolioItemType;
  entityId: string;
  bucketLabel: string | null;
  position: number;
  createdAt: Date;
}

interface EnrichedItem {
  id: string;
  entityType: PortfolioItemType;
  entityId: string;
  bucketLabel: string | null;
  position: number;
  createdAt: string;
  entity: {
    title: string;
    description: string | null;
    metadata: Record<string, unknown>;
  } | null;
}

async function enrichPortfolioItems(items: PortfolioItemRecord[]): Promise<EnrichedItem[]> {
  const trendIds = items.filter((i) => i.entityType === "TREND").map((i) => i.entityId);
  const techIds = items.filter((i) => i.entityType === "TECHNOLOGY").map((i) => i.entityId);
  const ideaIds = items.filter((i) => i.entityType === "IDEA").map((i) => i.entityId);
  const siaIds = items.filter((i) => i.entityType === "SIA").map((i) => i.entityId);

  const [trends, techs, ideas, sias] = await Promise.all([
    trendIds.length > 0
      ? prisma.trend.findMany({
          where: { id: { in: trendIds } },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            isArchived: true,
            _count: { select: { sias: true, insights: true } },
          },
        })
      : [],
    techIds.length > 0
      ? prisma.technology.findMany({
          where: { id: { in: techIds } },
          select: {
            id: true,
            title: true,
            description: true,
            maturityLevel: true,
            isArchived: true,
            _count: { select: { sias: true } },
          },
        })
      : [],
    ideaIds.length > 0
      ? prisma.idea.findMany({
          where: { id: { in: ideaIds } },
          select: {
            id: true,
            title: true,
            teaser: true,
            status: true,
            likesCount: true,
            commentsCount: true,
          },
        })
      : [],
    siaIds.length > 0
      ? prisma.strategicInnovationArea.findMany({
          where: { id: { in: siaIds } },
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            isActive: true,
            _count: { select: { campaigns: true } },
          },
        })
      : [],
  ]);

  const trendMap = new Map(trends.map((t) => [t.id, t]));
  const techMap = new Map(techs.map((t) => [t.id, t]));
  const ideaMap = new Map(ideas.map((i) => [i.id, i]));
  const siaMap = new Map(sias.map((s) => [s.id, s]));

  return items.map((item) => {
    let entity: EnrichedItem["entity"] = null;

    if (item.entityType === "TREND") {
      const trend = trendMap.get(item.entityId);
      if (trend) {
        entity = {
          title: trend.title,
          description: trend.description,
          metadata: {
            type: trend.type,
            isArchived: trend.isArchived,
            siaCount: trend._count.sias,
            insightCount: trend._count.insights,
          },
        };
      }
    } else if (item.entityType === "TECHNOLOGY") {
      const tech = techMap.get(item.entityId);
      if (tech) {
        entity = {
          title: tech.title,
          description: tech.description,
          metadata: {
            maturityLevel: tech.maturityLevel,
            isArchived: tech.isArchived,
            siaCount: tech._count.sias,
          },
        };
      }
    } else if (item.entityType === "IDEA") {
      const idea = ideaMap.get(item.entityId);
      if (idea) {
        entity = {
          title: idea.title,
          description: idea.teaser,
          metadata: {
            status: idea.status,
            likesCount: idea.likesCount,
            commentsCount: idea.commentsCount,
          },
        };
      }
    } else if (item.entityType === "SIA") {
      const sia = siaMap.get(item.entityId);
      if (sia) {
        entity = {
          title: sia.name,
          description: sia.description,
          metadata: {
            color: sia.color,
            isActive: sia.isActive,
            campaignCount: sia._count.campaigns,
          },
        };
      }
    }

    return {
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      bucketLabel: item.bucketLabel,
      position: item.position,
      createdAt: item.createdAt.toISOString(),
      entity,
    };
  });
}

export async function createPortfolio(input: PortfolioCreateInput, userId: string) {
  const portfolio = await prisma.innovationPortfolio.create({
    data: {
      title: input.title,
      description: input.description,
      createdById: userId,
    },
    include: portfolioInclude,
  });

  childLogger.info({ portfolioId: portfolio.id }, "Innovation Portfolio created");

  eventBus.emit("portfolio.created", {
    entity: "portfolio",
    entityId: portfolio.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: portfolio.title },
  });

  return mapPortfolioToResponse(portfolio);
}

export async function updatePortfolio(input: PortfolioUpdateInput, userId: string) {
  const existing = await prisma.innovationPortfolio.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new PortfolioServiceError("PORTFOLIO_NOT_FOUND", "Innovation Portfolio not found");
  }

  const { id, ...data } = input;
  const updateData: Prisma.InnovationPortfolioUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  const portfolio = await prisma.innovationPortfolio.update({
    where: { id },
    data: updateData,
    include: portfolioInclude,
  });

  childLogger.info({ portfolioId: portfolio.id }, "Innovation Portfolio updated");

  eventBus.emit("portfolio.updated", {
    entity: "portfolio",
    entityId: portfolio.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: portfolio.title },
  });

  return mapPortfolioToResponse(portfolio);
}

export async function deletePortfolio(id: string, userId: string) {
  const existing = await prisma.innovationPortfolio.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!existing) {
    throw new PortfolioServiceError("PORTFOLIO_NOT_FOUND", "Innovation Portfolio not found");
  }

  await prisma.innovationPortfolio.delete({ where: { id } });

  childLogger.info({ portfolioId: id }, "Innovation Portfolio deleted");

  eventBus.emit("portfolio.deleted", {
    entity: "portfolio",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title },
  });

  return { success: true };
}

async function validateEntityExists(
  entityType: PortfolioItemType,
  entityId: string,
): Promise<boolean> {
  switch (entityType) {
    case "TREND":
      return !!(await prisma.trend.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "TECHNOLOGY":
      return !!(await prisma.technology.findUnique({
        where: { id: entityId },
        select: { id: true },
      }));
    case "IDEA":
      return !!(await prisma.idea.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "SIA":
      return !!(await prisma.strategicInnovationArea.findUnique({
        where: { id: entityId },
        select: { id: true },
      }));
    default:
      return false;
  }
}

export async function addItemToPortfolio(input: PortfolioAddItemInput, userId: string) {
  const portfolio = await prisma.innovationPortfolio.findUnique({
    where: { id: input.portfolioId },
    select: { id: true, title: true },
  });

  if (!portfolio) {
    throw new PortfolioServiceError("PORTFOLIO_NOT_FOUND", "Innovation Portfolio not found");
  }

  const entityExists = await validateEntityExists(input.entityType, input.entityId);
  if (!entityExists) {
    throw new PortfolioServiceError("ENTITY_NOT_FOUND", `${input.entityType} entity not found`);
  }

  const maxPosition = await prisma.portfolioItem.aggregate({
    where: { portfolioId: input.portfolioId },
    _max: { position: true },
  });

  const nextPosition = (maxPosition._max.position ?? -1) + 1;

  const item = await prisma.portfolioItem.create({
    data: {
      portfolioId: input.portfolioId,
      entityType: input.entityType,
      entityId: input.entityId,
      bucketLabel: input.bucketLabel ?? null,
      position: nextPosition,
    },
  });

  childLogger.info(
    { portfolioId: input.portfolioId, itemId: item.id, entityType: input.entityType },
    "Item added to portfolio",
  );

  eventBus.emit("portfolio.itemAdded", {
    entity: "portfolio",
    entityId: input.portfolioId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { itemId: item.id, entityType: input.entityType, entityId: input.entityId },
  });

  return { id: item.id, position: item.position };
}

export async function removeItemFromPortfolio(input: PortfolioRemoveItemInput, userId: string) {
  const item = await prisma.portfolioItem.findUnique({
    where: { id: input.itemId },
    select: { id: true, portfolioId: true, entityType: true, entityId: true },
  });

  if (!item || item.portfolioId !== input.portfolioId) {
    throw new PortfolioServiceError("ITEM_NOT_FOUND", "Portfolio item not found");
  }

  await prisma.portfolioItem.delete({ where: { id: input.itemId } });

  childLogger.info(
    { portfolioId: input.portfolioId, itemId: input.itemId },
    "Item removed from portfolio",
  );

  eventBus.emit("portfolio.itemRemoved", {
    entity: "portfolio",
    entityId: input.portfolioId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { itemId: input.itemId, entityType: item.entityType, entityId: item.entityId },
  });

  return { success: true };
}

export async function reorderPortfolioItems(input: PortfolioReorderItemsInput, userId: string) {
  const portfolio = await prisma.innovationPortfolio.findUnique({
    where: { id: input.portfolioId },
    select: { id: true },
  });

  if (!portfolio) {
    throw new PortfolioServiceError("PORTFOLIO_NOT_FOUND", "Innovation Portfolio not found");
  }

  await prisma.$transaction(
    input.items.map((item) =>
      prisma.portfolioItem.update({
        where: { id: item.id },
        data: {
          position: item.position,
          ...(item.bucketLabel !== undefined ? { bucketLabel: item.bucketLabel } : {}),
        },
      }),
    ),
  );

  childLogger.info(
    { portfolioId: input.portfolioId, itemCount: input.items.length },
    "Portfolio items reordered",
  );

  eventBus.emit("portfolio.itemsReordered", {
    entity: "portfolio",
    entityId: input.portfolioId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { itemCount: input.items.length },
  });

  return { success: true };
}

export async function getPortfolioAnalytics(id: string) {
  const portfolio = await prisma.innovationPortfolio.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!portfolio) {
    throw new PortfolioServiceError("PORTFOLIO_NOT_FOUND", "Innovation Portfolio not found");
  }

  const typeCounts: Record<string, number> = {
    TREND: 0,
    TECHNOLOGY: 0,
    IDEA: 0,
    SIA: 0,
  };

  const bucketCounts: Record<string, number> = {};

  for (const item of portfolio.items) {
    typeCounts[item.entityType] = (typeCounts[item.entityType] ?? 0) + 1;
    const bucket = item.bucketLabel ?? "Uncategorized";
    bucketCounts[bucket] = (bucketCounts[bucket] ?? 0) + 1;
  }

  const siaIds = portfolio.items.filter((i) => i.entityType === "SIA").map((i) => i.entityId);

  const siaCoverage =
    siaIds.length > 0
      ? await prisma.strategicInnovationArea.findMany({
          where: { id: { in: siaIds } },
          select: { id: true, name: true, color: true },
        })
      : [];

  return {
    totalItems: portfolio.items.length,
    typeCounts,
    bucketCounts,
    siaCoverage,
  };
}
