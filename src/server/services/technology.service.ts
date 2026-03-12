import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  TechnologyListInput,
  TechnologyCreateInput,
  TechnologyUpdateInput,
  TechnologyLinkSiaInput,
  TechnologyUnlinkSiaInput,
  TechnologyLinkCampaignInput,
  TechnologyUnlinkCampaignInput,
  TechnologyLinkIdeaInput,
  TechnologyUnlinkIdeaInput,
} from "./technology.schemas";

const childLogger = logger.child({ service: "technology" });

export class TechnologyServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "TechnologyServiceError";
  }
}

const technologyInclude = {
  _count: {
    select: {
      sias: true,
      campaigns: true,
      ideas: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

type TechnologyWithCounts = Prisma.TechnologyGetPayload<{
  include: typeof technologyInclude;
}>;

function mapTechnologyToResponse(technology: TechnologyWithCounts) {
  return {
    id: technology.id,
    title: technology.title,
    description: technology.description,
    imageUrl: technology.imageUrl,
    sourceUrl: technology.sourceUrl,
    category: technology.category,
    maturity: technology.maturity,
    isConfidential: technology.isConfidential,
    isArchived: technology.isArchived,
    isCommunitySubmitted: technology.isCommunitySubmitted,
    businessRelevance: technology.businessRelevance,
    siaCount: technology._count.sias,
    campaignCount: technology._count.campaigns,
    ideaCount: technology._count.ideas,
    createdBy: technology.createdBy,
    createdAt: technology.createdAt.toISOString(),
    updatedAt: technology.updatedAt.toISOString(),
  };
}

export async function listTechnologies(input: TechnologyListInput) {
  const where: Prisma.TechnologyWhereInput = {};

  if (input.category) {
    where.category = input.category;
  }

  if (input.maturity) {
    where.maturity = input.maturity;
  }

  if (input.isArchived !== undefined) {
    where.isArchived = input.isArchived;
  }

  if (input.isConfidential !== undefined) {
    where.isConfidential = input.isConfidential;
  }

  if (input.siaId) {
    where.sias = {
      some: { siaId: input.siaId },
    };
  }

  if (input.campaignId) {
    where.campaigns = {
      some: { campaignId: input.campaignId },
    };
  }

  if (input.ideaId) {
    where.ideas = {
      some: { ideaId: input.ideaId },
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
  const orderBy: Prisma.TechnologyOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };

  const items = await prisma.technology.findMany({
    where,
    include: technologyInclude,
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
    items: items.map(mapTechnologyToResponse),
    nextCursor,
  };
}

export async function getTechnologyById(id: string) {
  const technology = await prisma.technology.findUnique({
    where: { id },
    include: {
      ...technologyInclude,
      sias: {
        include: {
          sia: {
            select: { id: true, name: true, color: true, isActive: true },
          },
        },
      },
      campaigns: {
        include: {
          campaign: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      ideas: {
        include: {
          idea: {
            select: { id: true, title: true, status: true },
          },
        },
      },
    },
  });

  if (!technology) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  return {
    ...mapTechnologyToResponse(technology),
    sias: technology.sias.map(
      (link: { sia: { id: string; name: string; color: string | null; isActive: boolean } }) => ({
        id: link.sia.id,
        name: link.sia.name,
        color: link.sia.color,
        isActive: link.sia.isActive,
      }),
    ),
    campaigns: technology.campaigns.map(
      (link: { campaign: { id: string; title: string; status: string } }) => ({
        id: link.campaign.id,
        title: link.campaign.title,
        status: link.campaign.status,
      }),
    ),
    ideas: technology.ideas.map(
      (link: { idea: { id: string; title: string; status: string } }) => ({
        id: link.idea.id,
        title: link.idea.title,
        status: link.idea.status,
      }),
    ),
  };
}

export async function createTechnology(input: TechnologyCreateInput, userId: string) {
  const technology = await prisma.technology.create({
    data: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      sourceUrl: input.sourceUrl,
      category: input.category,
      maturity: input.maturity,
      isConfidential: input.isConfidential,
      isCommunitySubmitted: input.isCommunitySubmitted,
      businessRelevance: input.businessRelevance,
      createdById: userId,
    },
    include: technologyInclude,
  });

  childLogger.info({ technologyId: technology.id }, "Technology created");

  eventBus.emit("technology.created", {
    entity: "technology",
    entityId: technology.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: technology.title, category: technology.category },
  });

  return mapTechnologyToResponse(technology);
}

export async function updateTechnology(input: TechnologyUpdateInput, userId: string) {
  const existing = await prisma.technology.findUnique({
    where: { id: input.id },
    select: { id: true, title: true },
  });

  if (!existing) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  const { id, ...data } = input;
  const updateData: Prisma.TechnologyUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.maturity !== undefined) updateData.maturity = data.maturity;
  if (data.isConfidential !== undefined) updateData.isConfidential = data.isConfidential;
  if (data.isCommunitySubmitted !== undefined)
    updateData.isCommunitySubmitted = data.isCommunitySubmitted;
  if (data.businessRelevance !== undefined) updateData.businessRelevance = data.businessRelevance;

  const technology = await prisma.technology.update({
    where: { id },
    data: updateData,
    include: technologyInclude,
  });

  childLogger.info({ technologyId: technology.id }, "Technology updated");

  eventBus.emit("technology.updated", {
    entity: "technology",
    entityId: technology.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: technology.title },
  });

  return mapTechnologyToResponse(technology);
}

export async function archiveTechnology(id: string, userId: string) {
  const existing = await prisma.technology.findUnique({
    where: { id },
    select: { id: true, title: true, isArchived: true },
  });

  if (!existing) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  const newArchived = !existing.isArchived;

  const technology = await prisma.technology.update({
    where: { id },
    data: { isArchived: newArchived },
    include: technologyInclude,
  });

  const eventName = newArchived ? "technology.archived" : "technology.activated";

  childLogger.info({ technologyId: id, isArchived: newArchived }, "Technology archive toggled");

  eventBus.emit(eventName, {
    entity: "technology",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title, isArchived: newArchived },
  });

  return mapTechnologyToResponse(technology);
}

export async function deleteTechnology(id: string, userId: string) {
  const existing = await prisma.technology.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!existing) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  await prisma.technology.delete({ where: { id } });

  childLogger.info({ technologyId: id }, "Technology deleted");

  eventBus.emit("technology.deleted", {
    entity: "technology",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title },
  });

  return { success: true };
}

export async function linkTechnologyToSia(input: TechnologyLinkSiaInput, userId: string) {
  const technology = await prisma.technology.findUnique({
    where: { id: input.technologyId },
    select: { id: true, title: true },
  });

  if (!technology) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  const sia = await prisma.strategicInnovationArea.findUnique({
    where: { id: input.siaId },
    select: { id: true, name: true },
  });

  if (!sia) {
    throw new TechnologyServiceError("SIA_NOT_FOUND", "Strategic Innovation Area not found");
  }

  const existingLink = await prisma.techSiaLink.findUnique({
    where: {
      techId_siaId: { techId: input.technologyId, siaId: input.siaId },
    },
  });

  if (existingLink) {
    return { success: true };
  }

  await prisma.techSiaLink.create({
    data: {
      techId: input.technologyId,
      siaId: input.siaId,
    },
  });

  childLogger.info(
    { technologyId: input.technologyId, siaId: input.siaId },
    "Technology linked to SIA",
  );

  eventBus.emit("technology.siaLinked", {
    entity: "technology",
    entityId: input.technologyId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: input.siaId, siaName: sia.name },
  });

  return { success: true };
}

export async function unlinkTechnologyFromSia(input: TechnologyUnlinkSiaInput, userId: string) {
  const existingLink = await prisma.techSiaLink.findUnique({
    where: {
      techId_siaId: { techId: input.technologyId, siaId: input.siaId },
    },
  });

  if (!existingLink) {
    return { success: true };
  }

  await prisma.techSiaLink.delete({
    where: {
      techId_siaId: { techId: input.technologyId, siaId: input.siaId },
    },
  });

  childLogger.info(
    { technologyId: input.technologyId, siaId: input.siaId },
    "Technology unlinked from SIA",
  );

  eventBus.emit("technology.siaUnlinked", {
    entity: "technology",
    entityId: input.technologyId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: input.siaId },
  });

  return { success: true };
}

export async function linkTechnologyToCampaign(input: TechnologyLinkCampaignInput, userId: string) {
  const technology = await prisma.technology.findUnique({
    where: { id: input.technologyId },
    select: { id: true, title: true },
  });

  if (!technology) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, title: true },
  });

  if (!campaign) {
    throw new TechnologyServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const existingLink = await prisma.technologyCampaignLink.findUnique({
    where: {
      technologyId_campaignId: {
        technologyId: input.technologyId,
        campaignId: input.campaignId,
      },
    },
  });

  if (existingLink) {
    return { success: true };
  }

  await prisma.technologyCampaignLink.create({
    data: {
      technologyId: input.technologyId,
      campaignId: input.campaignId,
    },
  });

  childLogger.info(
    { technologyId: input.technologyId, campaignId: input.campaignId },
    "Technology linked to campaign",
  );

  eventBus.emit("technology.campaignLinked", {
    entity: "technology",
    entityId: input.technologyId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId, campaignTitle: campaign.title },
  });

  return { success: true };
}

export async function unlinkTechnologyFromCampaign(
  input: TechnologyUnlinkCampaignInput,
  userId: string,
) {
  const existingLink = await prisma.technologyCampaignLink.findUnique({
    where: {
      technologyId_campaignId: {
        technologyId: input.technologyId,
        campaignId: input.campaignId,
      },
    },
  });

  if (!existingLink) {
    return { success: true };
  }

  await prisma.technologyCampaignLink.delete({
    where: {
      technologyId_campaignId: {
        technologyId: input.technologyId,
        campaignId: input.campaignId,
      },
    },
  });

  childLogger.info(
    { technologyId: input.technologyId, campaignId: input.campaignId },
    "Technology unlinked from campaign",
  );

  eventBus.emit("technology.campaignUnlinked", {
    entity: "technology",
    entityId: input.technologyId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId },
  });

  return { success: true };
}

export async function linkTechnologyToIdea(input: TechnologyLinkIdeaInput, userId: string) {
  const technology = await prisma.technology.findUnique({
    where: { id: input.technologyId },
    select: { id: true, title: true },
  });

  if (!technology) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: { id: true, title: true },
  });

  if (!idea) {
    throw new TechnologyServiceError("IDEA_NOT_FOUND", "Idea not found");
  }

  const existingLink = await prisma.technologyIdeaLink.findUnique({
    where: {
      technologyId_ideaId: {
        technologyId: input.technologyId,
        ideaId: input.ideaId,
      },
    },
  });

  if (existingLink) {
    return { success: true };
  }

  await prisma.technologyIdeaLink.create({
    data: {
      technologyId: input.technologyId,
      ideaId: input.ideaId,
    },
  });

  childLogger.info(
    { technologyId: input.technologyId, ideaId: input.ideaId },
    "Technology linked to idea",
  );

  eventBus.emit("technology.ideaLinked", {
    entity: "technology",
    entityId: input.technologyId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: input.ideaId, ideaTitle: idea.title },
  });

  return { success: true };
}

export async function unlinkTechnologyFromIdea(input: TechnologyUnlinkIdeaInput, userId: string) {
  const existingLink = await prisma.technologyIdeaLink.findUnique({
    where: {
      technologyId_ideaId: {
        technologyId: input.technologyId,
        ideaId: input.ideaId,
      },
    },
  });

  if (!existingLink) {
    return { success: true };
  }

  await prisma.technologyIdeaLink.delete({
    where: {
      technologyId_ideaId: {
        technologyId: input.technologyId,
        ideaId: input.ideaId,
      },
    },
  });

  childLogger.info(
    { technologyId: input.technologyId, ideaId: input.ideaId },
    "Technology unlinked from idea",
  );

  eventBus.emit("technology.ideaUnlinked", {
    entity: "technology",
    entityId: input.technologyId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: input.ideaId },
  });

  return { success: true };
}
