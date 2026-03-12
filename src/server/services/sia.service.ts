import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  SiaListInput,
  SiaCreateInput,
  SiaUpdateInput,
  SiaLinkCampaignInput,
  SiaUnlinkCampaignInput,
} from "./sia.schemas";

const childLogger = logger.child({ service: "sia" });

export class SiaServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "SiaServiceError";
  }
}

const siaInclude = {
  _count: {
    select: {
      campaigns: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

type SiaWithCounts = Prisma.StrategicInnovationAreaGetPayload<{
  include: typeof siaInclude;
}>;

function mapSiaToResponse(sia: SiaWithCounts) {
  return {
    id: sia.id,
    name: sia.name,
    description: sia.description,
    color: sia.color,
    bannerUrl: sia.bannerUrl,
    isActive: sia.isActive,
    campaignCount: sia._count.campaigns,
    createdBy: sia.createdBy,
    createdAt: sia.createdAt.toISOString(),
    updatedAt: sia.updatedAt.toISOString(),
  };
}

export async function listSias(input: SiaListInput) {
  const where: Prisma.StrategicInnovationAreaWhereInput = {};

  if (input.isActive !== undefined) {
    where.isActive = input.isActive;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const sortBy = input.sortBy ?? "name";
  const sortDirection = input.sortDirection ?? "asc";
  const limit = input.limit ?? 20;
  const orderBy: Prisma.StrategicInnovationAreaOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.strategicInnovationArea.findMany({
    where,
    include: siaInclude,
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
    items: items.map(mapSiaToResponse),
    nextCursor,
  };
}

export async function getSiaById(id: string) {
  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id },
    include: {
      ...siaInclude,
      campaigns: {
        select: {
          id: true,
          title: true,
          status: true,
          submissionCloseDate: true,
          _count: { select: { ideas: true, members: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!sia) {
    throw new SiaServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  return {
    ...mapSiaToResponse(sia),
    campaigns: sia.campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      submissionCloseDate: c.submissionCloseDate?.toISOString() ?? null,
      ideaCount: c._count.ideas,
      memberCount: c._count.members,
    })),
  };
}

export async function createSia(input: SiaCreateInput, userId: string) {
  const sia = await prisma.strategicInnovationArea.create({
    data: {
      name: input.name,
      description: input.description,
      color: input.color,
      bannerUrl: input.bannerUrl,
      isActive: input.isActive,
      createdById: userId,
    },
    include: siaInclude,
  });

  childLogger.info({ siaId: sia.id }, "Strategic Innovation Area created");

  eventBus.emit("sia.created", {
    entity: "sia",
    entityId: sia.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: sia.name },
  });

  return mapSiaToResponse(sia);
}

export async function updateSia(input: SiaUpdateInput, userId: string) {
  const existing = await prisma.strategicInnovationArea.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new SiaServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  const { id, ...data } = input;
  const updateData: Prisma.StrategicInnovationAreaUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  const sia = await prisma.strategicInnovationArea.update({
    where: { id },
    data: updateData,
    include: siaInclude,
  });

  childLogger.info({ siaId: sia.id }, "Strategic Innovation Area updated");

  if (data.isActive !== undefined) {
    if (existing.isActive && !data.isActive) {
      eventBus.emit("sia.archived", {
        entity: "sia",
        entityId: id,
        actor: userId,
        timestamp: new Date().toISOString(),
        metadata: { name: existing.name },
      });
    } else if (!existing.isActive && data.isActive) {
      eventBus.emit("sia.activated", {
        entity: "sia",
        entityId: id,
        actor: userId,
        timestamp: new Date().toISOString(),
        metadata: { name: existing.name },
      });
    }
  }

  eventBus.emit("sia.updated", {
    entity: "sia",
    entityId: sia.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: sia.name },
  });

  return mapSiaToResponse(sia);
}

export async function deleteSia(id: string, userId: string) {
  const existing = await prisma.strategicInnovationArea.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { campaigns: true } } },
  });

  if (!existing) {
    throw new SiaServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  // Unlink campaigns and delete in a single transaction for atomicity
  await prisma.$transaction(async (tx) => {
    if (existing._count.campaigns > 0) {
      await tx.campaign.updateMany({
        where: { siaId: id },
        data: { siaId: null },
      });
    }

    await tx.strategicInnovationArea.delete({ where: { id } });
  });

  childLogger.info({ siaId: id }, "Strategic Innovation Area deleted");

  eventBus.emit("sia.deleted", {
    entity: "sia",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { name: existing.name },
  });

  return { success: true };
}

export async function linkCampaignToSia(input: SiaLinkCampaignInput, userId: string) {
  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id: input.siaId },
    select: { id: true, name: true },
  });

  if (!sia) {
    throw new SiaServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new SiaServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: { siaId: input.siaId },
  });

  childLogger.info({ siaId: input.siaId, campaignId: input.campaignId }, "Campaign linked to SIA");

  eventBus.emit("sia.campaignLinked", {
    entity: "sia",
    entityId: input.siaId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId, campaignTitle: campaign.title },
  });

  return { success: true };
}

export async function unlinkCampaignFromSia(input: SiaUnlinkCampaignInput, userId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, siaId: true, title: true },
  });

  if (!campaign) {
    throw new SiaServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  if (!campaign.siaId) {
    return { success: true };
  }

  const siaId = campaign.siaId;

  await prisma.campaign.update({
    where: { id: input.campaignId },
    data: { siaId: null },
  });

  childLogger.info({ siaId, campaignId: input.campaignId }, "Campaign unlinked from SIA");

  eventBus.emit("sia.campaignUnlinked", {
    entity: "sia",
    entityId: siaId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId, campaignTitle: campaign.title },
  });

  return { success: true };
}
