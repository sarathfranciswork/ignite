import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type {
  SiaCreateInput,
  SiaUpdateInput,
  SiaListInput,
  SiaLinkCampaignInput,
  SiaUnlinkCampaignInput,
} from "./sia.schemas";

const childLogger = logger.child({ service: "sia" });

export class SiaServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SiaServiceError";
  }
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

  const items = await prisma.strategicInnovationArea.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { campaignLinks: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((sia) => ({
      id: sia.id,
      name: sia.name,
      description: sia.description,
      imageUrl: sia.imageUrl,
      isActive: sia.isActive,
      campaignCount: sia._count.campaignLinks,
      createdBy: sia.createdBy,
      createdAt: sia.createdAt.toISOString(),
      updatedAt: sia.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getSiaById(id: string) {
  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      campaignLinks: {
        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              status: true,
              teaser: true,
            },
          },
        },
        orderBy: { linkedAt: "desc" },
      },
      _count: { select: { campaignLinks: true } },
    },
  });

  if (!sia) {
    throw new SiaServiceError("Strategic Innovation Area not found", "SIA_NOT_FOUND");
  }

  return {
    id: sia.id,
    name: sia.name,
    description: sia.description,
    imageUrl: sia.imageUrl,
    isActive: sia.isActive,
    campaignCount: sia._count.campaignLinks,
    campaigns: sia.campaignLinks.map((link) => ({
      id: link.campaign.id,
      title: link.campaign.title,
      status: link.campaign.status,
      teaser: link.campaign.teaser,
      linkedAt: link.linkedAt.toISOString(),
    })),
    createdBy: sia.createdBy,
    createdAt: sia.createdAt.toISOString(),
    updatedAt: sia.updatedAt.toISOString(),
  };
}

export async function createSia(input: SiaCreateInput, createdById: string) {
  const sia = await prisma.strategicInnovationArea.create({
    data: {
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      createdById,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  eventBus.emit("sia.created", {
    entity: "sia",
    entityId: sia.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: { name: sia.name },
  });

  childLogger.info({ siaId: sia.id, name: sia.name }, "SIA created");

  return {
    id: sia.id,
    name: sia.name,
    description: sia.description,
    imageUrl: sia.imageUrl,
    isActive: sia.isActive,
    campaignCount: 0,
    createdBy: sia.createdBy,
    createdAt: sia.createdAt.toISOString(),
    updatedAt: sia.updatedAt.toISOString(),
  };
}

export async function updateSia(input: SiaUpdateInput, updatedById: string) {
  const existing = await prisma.strategicInnovationArea.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new SiaServiceError("Strategic Innovation Area not found", "SIA_NOT_FOUND");
  }

  const { id, ...updateData } = input;
  const data: Prisma.StrategicInnovationAreaUpdateInput = {};

  if (updateData.name !== undefined) data.name = updateData.name;
  if (updateData.description !== undefined) data.description = updateData.description;
  if (updateData.imageUrl !== undefined) data.imageUrl = updateData.imageUrl;
  if (updateData.isActive !== undefined) data.isActive = updateData.isActive;

  const sia = await prisma.strategicInnovationArea.update({
    where: { id },
    data,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { campaignLinks: true } },
    },
  });

  eventBus.emit("sia.updated", {
    entity: "sia",
    entityId: sia.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(updateData) },
  });

  childLogger.info({ siaId: sia.id }, "SIA updated");

  return {
    id: sia.id,
    name: sia.name,
    description: sia.description,
    imageUrl: sia.imageUrl,
    isActive: sia.isActive,
    campaignCount: sia._count.campaignLinks,
    createdBy: sia.createdBy,
    createdAt: sia.createdAt.toISOString(),
    updatedAt: sia.updatedAt.toISOString(),
  };
}

export async function archiveSia(siaId: string, actor: string) {
  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id: siaId },
    select: { id: true, isActive: true },
  });

  if (!sia) {
    throw new SiaServiceError("Strategic Innovation Area not found", "SIA_NOT_FOUND");
  }

  if (!sia.isActive) {
    throw new SiaServiceError("SIA is already archived", "ALREADY_ARCHIVED");
  }

  const updated = await prisma.strategicInnovationArea.update({
    where: { id: siaId },
    data: { isActive: false },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      _count: { select: { campaignLinks: true } },
    },
  });

  eventBus.emit("sia.archived", {
    entity: "sia",
    entityId: siaId,
    actor,
    timestamp: new Date().toISOString(),
  });

  childLogger.info({ siaId }, "SIA archived");

  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    imageUrl: updated.imageUrl,
    isActive: updated.isActive,
    campaignCount: updated._count.campaignLinks,
    createdBy: updated.createdBy,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteSia(id: string, userId: string) {
  const existing = await prisma.strategicInnovationArea.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { campaignLinks: true } } },
  });

  if (!existing) {
    throw new SiaServiceError("Strategic Innovation Area not found", "SIA_NOT_FOUND");
  }

  // Delete campaign links before deleting
  if (existing._count.campaignLinks > 0) {
    await prisma.campaignSia.deleteMany({
      where: { siaId: id },
    });
  }

  await prisma.strategicInnovationArea.delete({ where: { id } });

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

export async function linkCampaign(input: SiaLinkCampaignInput, linkedBy: string) {
  const [sia, campaign] = await Promise.all([
    prisma.strategicInnovationArea.findUnique({
      where: { id: input.siaId },
      select: { id: true, isActive: true },
    }),
    prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { id: true, title: true },
    }),
  ]);

  if (!sia) {
    throw new SiaServiceError("Strategic Innovation Area not found", "SIA_NOT_FOUND");
  }

  if (!sia.isActive) {
    throw new SiaServiceError("Cannot link to an archived SIA", "SIA_ARCHIVED");
  }

  if (!campaign) {
    throw new SiaServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const existing = await prisma.campaignSia.findUnique({
    where: { campaignId_siaId: { campaignId: input.campaignId, siaId: input.siaId } },
  });

  if (existing) {
    throw new SiaServiceError("Campaign is already linked to this SIA", "ALREADY_LINKED");
  }

  const link = await prisma.campaignSia.create({
    data: {
      campaignId: input.campaignId,
      siaId: input.siaId,
      linkedBy,
    },
  });

  eventBus.emit("sia.campaignLinked", {
    entity: "sia",
    entityId: input.siaId,
    actor: linkedBy,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId, campaignTitle: campaign.title },
  });

  childLogger.info({ siaId: input.siaId, campaignId: input.campaignId }, "Campaign linked to SIA");

  return { id: link.id, siaId: link.siaId, campaignId: link.campaignId };
}

export async function unlinkCampaign(input: SiaUnlinkCampaignInput, actor: string) {
  const existing = await prisma.campaignSia.findUnique({
    where: { campaignId_siaId: { campaignId: input.campaignId, siaId: input.siaId } },
  });

  if (!existing) {
    throw new SiaServiceError("Campaign is not linked to this SIA", "NOT_LINKED");
  }

  await prisma.campaignSia.delete({
    where: { campaignId_siaId: { campaignId: input.campaignId, siaId: input.siaId } },
  });

  eventBus.emit("sia.campaignUnlinked", {
    entity: "sia",
    entityId: input.siaId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId },
  });

  childLogger.info(
    { siaId: input.siaId, campaignId: input.campaignId },
    "Campaign unlinked from SIA",
  );

  return { success: true };
}
