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
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

type TechnologyWithCounts = Prisma.TechnologyGetPayload<{
  include: typeof technologyInclude;
}>;

function mapTechnologyToResponse(tech: TechnologyWithCounts) {
  return {
    id: tech.id,
    title: tech.title,
    description: tech.description,
    imageUrl: tech.imageUrl,
    sourceUrl: tech.sourceUrl,
    maturityLevel: tech.maturityLevel,
    isConfidential: tech.isConfidential,
    isArchived: tech.isArchived,
    siaCount: tech._count.sias,
    createdBy: tech.createdBy,
    createdAt: tech.createdAt.toISOString(),
    updatedAt: tech.updatedAt.toISOString(),
  };
}

export async function listTechnologies(input: TechnologyListInput) {
  const where: Prisma.TechnologyWhereInput = {};

  if (input.maturityLevel) {
    where.maturityLevel = input.maturityLevel;
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
  const tech = await prisma.technology.findUnique({
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
    },
  });

  if (!tech) {
    throw new TechnologyServiceError("TECHNOLOGY_NOT_FOUND", "Technology not found");
  }

  return {
    ...mapTechnologyToResponse(tech),
    sias: tech.sias.map(
      (link: { sia: { id: string; name: string; color: string | null; isActive: boolean } }) => ({
        id: link.sia.id,
        name: link.sia.name,
        color: link.sia.color,
        isActive: link.sia.isActive,
      }),
    ),
  };
}

export async function createTechnology(input: TechnologyCreateInput, userId: string) {
  const tech = await prisma.technology.create({
    data: {
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      sourceUrl: input.sourceUrl,
      maturityLevel: input.maturityLevel ?? undefined,
      isConfidential: input.isConfidential,
      createdById: userId,
    },
    include: technologyInclude,
  });

  childLogger.info({ technologyId: tech.id }, "Technology created");

  eventBus.emit("technology.created", {
    entity: "technology",
    entityId: tech.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: tech.title, maturityLevel: tech.maturityLevel },
  });

  return mapTechnologyToResponse(tech);
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
  if (data.maturityLevel !== undefined) updateData.maturityLevel = data.maturityLevel;
  if (data.isConfidential !== undefined) updateData.isConfidential = data.isConfidential;

  const tech = await prisma.technology.update({
    where: { id },
    data: updateData,
    include: technologyInclude,
  });

  childLogger.info({ technologyId: tech.id }, "Technology updated");

  eventBus.emit("technology.updated", {
    entity: "technology",
    entityId: tech.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: tech.title },
  });

  return mapTechnologyToResponse(tech);
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

  const tech = await prisma.technology.update({
    where: { id },
    data: { isArchived: newArchived },
    include: technologyInclude,
  });

  const eventName = newArchived ? "technology.archived" : "technology.unarchived";

  childLogger.info({ technologyId: id, isArchived: newArchived }, "Technology archive toggled");

  eventBus.emit(eventName, {
    entity: "technology",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { title: existing.title, isArchived: newArchived },
  });

  return mapTechnologyToResponse(tech);
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
  const tech = await prisma.technology.findUnique({
    where: { id: input.techId },
    select: { id: true, title: true },
  });

  if (!tech) {
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
      techId_siaId: { techId: input.techId, siaId: input.siaId },
    },
  });

  if (existingLink) {
    return { success: true };
  }

  await prisma.techSiaLink.create({
    data: {
      techId: input.techId,
      siaId: input.siaId,
    },
  });

  childLogger.info({ technologyId: input.techId, siaId: input.siaId }, "Technology linked to SIA");

  eventBus.emit("technology.siaLinked", {
    entity: "technology",
    entityId: input.techId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: input.siaId, siaName: sia.name },
  });

  return { success: true };
}

export async function unlinkTechnologyFromSia(input: TechnologyUnlinkSiaInput, userId: string) {
  const existingLink = await prisma.techSiaLink.findUnique({
    where: {
      techId_siaId: { techId: input.techId, siaId: input.siaId },
    },
  });

  if (!existingLink) {
    return { success: true };
  }

  await prisma.techSiaLink.delete({
    where: {
      techId_siaId: { techId: input.techId, siaId: input.siaId },
    },
  });

  childLogger.info(
    { technologyId: input.techId, siaId: input.siaId },
    "Technology unlinked from SIA",
  );

  eventBus.emit("technology.siaUnlinked", {
    entity: "technology",
    entityId: input.techId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { siaId: input.siaId },
  });

  return { success: true };
}
