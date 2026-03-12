import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type {
  BucketCreateInput,
  BucketUpdateInput,
  BucketListInput,
  BucketReorderInput,
  BucketAssignIdeaInput,
  BucketUnassignIdeaInput,
  BucketListIdeasInput,
  BucketSidebarInput,
  SmartBucketFilterCriteria,
} from "./bucket.schemas";

const childLogger = logger.child({ service: "bucket" });

// ── Error Class ─────────────────────────────────────────────

export class BucketServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "BucketServiceError";
  }
}

// ── List Buckets ────────────────────────────────────────────

export async function listBuckets(input: BucketListInput) {
  const where: Prisma.BucketWhereInput = {
    campaignId: input.campaignId,
  };

  if (input.type) {
    where.type = input.type;
  }

  const items = await prisma.bucket.findMany({
    where,
    include: {
      _count: { select: { assignments: true } },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { sortOrder: "asc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((b) => ({
      id: b.id,
      campaignId: b.campaignId,
      name: b.name,
      color: b.color,
      type: b.type,
      description: b.description,
      sortOrder: b.sortOrder,
      filterCriteria: b.filterCriteria as SmartBucketFilterCriteria | null,
      ideaCount: b._count.assignments,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

// ── Get Bucket By ID ────────────────────────────────────────

export async function getBucketById(id: string) {
  const bucket = await prisma.bucket.findUnique({
    where: { id },
    include: {
      _count: { select: { assignments: true } },
    },
  });

  if (!bucket) {
    throw new BucketServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  return {
    id: bucket.id,
    campaignId: bucket.campaignId,
    name: bucket.name,
    color: bucket.color,
    type: bucket.type,
    description: bucket.description,
    sortOrder: bucket.sortOrder,
    filterCriteria: bucket.filterCriteria as SmartBucketFilterCriteria | null,
    ideaCount: bucket._count.assignments,
    createdById: bucket.createdById,
    createdAt: bucket.createdAt.toISOString(),
    updatedAt: bucket.updatedAt.toISOString(),
  };
}

// ── Create Bucket ───────────────────────────────────────────

export async function createBucket(input: BucketCreateInput, createdById: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new BucketServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  if (input.type === "SMART" && !input.filterCriteria) {
    throw new BucketServiceError(
      "Smart buckets require filter criteria",
      "MISSING_FILTER_CRITERIA",
    );
  }

  const existingCount = await prisma.bucket.count({
    where: { campaignId: input.campaignId },
  });

  const bucket = await prisma.bucket.create({
    data: {
      campaignId: input.campaignId,
      name: input.name,
      color: input.color,
      type: input.type,
      description: input.description,
      filterCriteria: input.filterCriteria as Prisma.InputJsonValue | undefined,
      sortOrder: existingCount,
      createdById,
    },
    include: {
      _count: { select: { assignments: true } },
    },
  });

  eventBus.emit("bucket.created", {
    entity: "bucket",
    entityId: bucket.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: input.campaignId,
      name: bucket.name,
      type: bucket.type,
    },
  });

  childLogger.info(
    { bucketId: bucket.id, campaignId: input.campaignId, type: bucket.type },
    "Bucket created",
  );

  return {
    id: bucket.id,
    campaignId: bucket.campaignId,
    name: bucket.name,
    color: bucket.color,
    type: bucket.type,
    description: bucket.description,
    sortOrder: bucket.sortOrder,
    filterCriteria: bucket.filterCriteria as SmartBucketFilterCriteria | null,
    ideaCount: bucket._count.assignments,
    createdAt: bucket.createdAt.toISOString(),
    updatedAt: bucket.updatedAt.toISOString(),
  };
}

// ── Update Bucket ───────────────────────────────────────────

export async function updateBucket(input: BucketUpdateInput, updatedById: string) {
  const existing = await prisma.bucket.findUnique({
    where: { id: input.id },
    select: { id: true, type: true, campaignId: true },
  });

  if (!existing) {
    throw new BucketServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  const data: Prisma.BucketUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.color !== undefined) data.color = input.color;
  if (input.description !== undefined) data.description = input.description;
  if (input.filterCriteria !== undefined) {
    data.filterCriteria = input.filterCriteria as Prisma.InputJsonValue | undefined;
  }

  const bucket = await prisma.bucket.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { assignments: true } },
    },
  });

  eventBus.emit("bucket.updated", {
    entity: "bucket",
    entityId: bucket.id,
    actor: updatedById,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: existing.campaignId },
  });

  childLogger.info({ bucketId: bucket.id }, "Bucket updated");

  return {
    id: bucket.id,
    campaignId: bucket.campaignId,
    name: bucket.name,
    color: bucket.color,
    type: bucket.type,
    description: bucket.description,
    sortOrder: bucket.sortOrder,
    filterCriteria: bucket.filterCriteria as SmartBucketFilterCriteria | null,
    ideaCount: bucket._count.assignments,
    createdAt: bucket.createdAt.toISOString(),
    updatedAt: bucket.updatedAt.toISOString(),
  };
}

// ── Delete Bucket ───────────────────────────────────────────

export async function deleteBucket(id: string, actor: string) {
  const bucket = await prisma.bucket.findUnique({
    where: { id },
    select: { id: true, campaignId: true, name: true },
  });

  if (!bucket) {
    throw new BucketServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  await prisma.bucket.delete({ where: { id } });

  eventBus.emit("bucket.deleted", {
    entity: "bucket",
    entityId: id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: bucket.campaignId, name: bucket.name },
  });

  childLogger.info({ bucketId: id, campaignId: bucket.campaignId }, "Bucket deleted");

  return { success: true };
}

// ── Reorder Buckets ─────────────────────────────────────────

export async function reorderBuckets(input: BucketReorderInput, _actor: string) {
  const updates = input.bucketIds.map((bucketId, index) =>
    prisma.bucket.updateMany({
      where: { id: bucketId, campaignId: input.campaignId },
      data: { sortOrder: index },
    }),
  );

  await prisma.$transaction(updates);

  childLogger.info({ campaignId: input.campaignId }, "Buckets reordered");

  return { success: true };
}

// ── Assign Idea to Bucket ───────────────────────────────────

export async function assignIdeaToBucket(input: BucketAssignIdeaInput, actor: string) {
  const bucket = await prisma.bucket.findUnique({
    where: { id: input.bucketId },
    select: { id: true, type: true, campaignId: true },
  });

  if (!bucket) {
    throw new BucketServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  if (bucket.type === "SMART") {
    throw new BucketServiceError(
      "Cannot manually assign ideas to smart buckets",
      "SMART_BUCKET_NO_MANUAL_ASSIGN",
    );
  }

  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: { id: true, campaignId: true },
  });

  if (!idea) {
    throw new BucketServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (idea.campaignId !== bucket.campaignId) {
    throw new BucketServiceError(
      "Idea and bucket must belong to the same campaign",
      "CAMPAIGN_MISMATCH",
    );
  }

  const currentMax = await prisma.ideaBucketAssignment.aggregate({
    where: { bucketId: input.bucketId },
    _max: { sortOrder: true },
  });

  const nextSortOrder = (currentMax._max.sortOrder ?? -1) + 1;

  const assignment = await prisma.ideaBucketAssignment.create({
    data: {
      bucketId: input.bucketId,
      ideaId: input.ideaId,
      sortOrder: nextSortOrder,
    },
  });

  eventBus.emit("bucket.ideaAssigned", {
    entity: "bucket",
    entityId: input.bucketId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: input.ideaId, campaignId: bucket.campaignId },
  });

  childLogger.info({ bucketId: input.bucketId, ideaId: input.ideaId }, "Idea assigned to bucket");

  return {
    id: assignment.id,
    bucketId: assignment.bucketId,
    ideaId: assignment.ideaId,
    sortOrder: assignment.sortOrder,
    addedAt: assignment.addedAt.toISOString(),
  };
}

// ── Unassign Idea from Bucket ───────────────────────────────

export async function unassignIdeaFromBucket(input: BucketUnassignIdeaInput, actor: string) {
  const assignment = await prisma.ideaBucketAssignment.findUnique({
    where: {
      bucketId_ideaId: {
        bucketId: input.bucketId,
        ideaId: input.ideaId,
      },
    },
    include: {
      bucket: { select: { type: true, campaignId: true } },
    },
  });

  if (!assignment) {
    throw new BucketServiceError("Idea is not assigned to this bucket", "ASSIGNMENT_NOT_FOUND");
  }

  if (assignment.bucket.type === "SMART") {
    throw new BucketServiceError(
      "Cannot manually unassign ideas from smart buckets",
      "SMART_BUCKET_NO_MANUAL_UNASSIGN",
    );
  }

  await prisma.ideaBucketAssignment.delete({
    where: { id: assignment.id },
  });

  eventBus.emit("bucket.ideaUnassigned", {
    entity: "bucket",
    entityId: input.bucketId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { ideaId: input.ideaId, campaignId: assignment.bucket.campaignId },
  });

  childLogger.info(
    { bucketId: input.bucketId, ideaId: input.ideaId },
    "Idea unassigned from bucket",
  );

  return { success: true };
}

// ── List Ideas in Bucket ────────────────────────────────────

export async function listBucketIdeas(input: BucketListIdeasInput) {
  const bucket = await prisma.bucket.findUnique({
    where: { id: input.bucketId },
    select: { id: true, type: true, campaignId: true, filterCriteria: true },
  });

  if (!bucket) {
    throw new BucketServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  if (bucket.type === "SMART") {
    return evaluateSmartBucket(bucket.id, bucket.campaignId, bucket.filterCriteria, input);
  }

  return listManualBucketIdeas(input);
}

// ── Manual Bucket Ideas ─────────────────────────────────────

async function listManualBucketIdeas(input: BucketListIdeasInput) {
  const assignments = await prisma.ideaBucketAssignment.findMany({
    where: { bucketId: input.bucketId },
    include: {
      idea: {
        select: {
          id: true,
          title: true,
          teaser: true,
          status: true,
          category: true,
          tags: true,
          likesCount: true,
          commentsCount: true,
          viewsCount: true,
          createdAt: true,
          contributor: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { sortOrder: "asc" },
  });

  let nextCursor: string | undefined;
  if (assignments.length > input.limit) {
    const next = assignments.pop();
    nextCursor = next?.id;
  }

  return {
    items: assignments.map((a) => ({
      assignmentId: a.id,
      sortOrder: a.sortOrder,
      addedAt: a.addedAt.toISOString(),
      idea: {
        ...a.idea,
        createdAt: a.idea.createdAt.toISOString(),
      },
    })),
    nextCursor,
  };
}

// ── Smart Bucket Evaluation ─────────────────────────────────

async function evaluateSmartBucket(
  bucketId: string,
  campaignId: string,
  filterCriteria: unknown,
  input: BucketListIdeasInput,
) {
  const filters = filterCriteria as SmartBucketFilterCriteria | null;
  const where: Prisma.IdeaWhereInput = {
    campaignId,
  };

  if (filters) {
    if (filters.status) {
      where.status = filters.status as Prisma.EnumIdeaStatusFilter;
    }
    if (filters.minLikes !== undefined) {
      where.likesCount = { gte: filters.minLikes };
    }
    if (filters.minComments !== undefined) {
      where.commentsCount = { gte: filters.minComments };
    }
    if (filters.minViews !== undefined) {
      where.viewsCount = { gte: filters.minViews };
    }
    if (filters.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { teaser: { contains: filters.search, mode: "insensitive" } },
      ];
    }
  }

  const ideas = await prisma.idea.findMany({
    where,
    select: {
      id: true,
      title: true,
      teaser: true,
      status: true,
      category: true,
      tags: true,
      likesCount: true,
      commentsCount: true,
      viewsCount: true,
      createdAt: true,
      contributor: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (ideas.length > input.limit) {
    const next = ideas.pop();
    nextCursor = next?.id;
  }

  return {
    items: ideas.map((idea) => ({
      assignmentId: null,
      sortOrder: 0,
      addedAt: null,
      idea: {
        ...idea,
        createdAt: idea.createdAt.toISOString(),
      },
    })),
    nextCursor,
  };
}

// ── Bucket Sidebar ──────────────────────────────────────────

export async function getBucketSidebar(input: BucketSidebarInput) {
  const buckets = await prisma.bucket.findMany({
    where: { campaignId: input.campaignId },
    include: {
      _count: { select: { assignments: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const smartBucketCounts = await Promise.all(
    buckets
      .filter((b) => b.type === "SMART")
      .map(async (b) => {
        const count = await getSmartBucketCount(b.campaignId, b.filterCriteria);
        return { id: b.id, count };
      }),
  );

  const smartCountMap = new Map(smartBucketCounts.map((c) => [c.id, c.count]));

  return buckets.map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    type: b.type,
    ideaCount: b.type === "SMART" ? (smartCountMap.get(b.id) ?? 0) : b._count.assignments,
    sortOrder: b.sortOrder,
  }));
}

// ── Smart Bucket Count ──────────────────────────────────────

async function getSmartBucketCount(campaignId: string, filterCriteria: unknown): Promise<number> {
  const filters = filterCriteria as SmartBucketFilterCriteria | null;
  const where: Prisma.IdeaWhereInput = { campaignId };

  if (filters) {
    if (filters.status) {
      where.status = filters.status as Prisma.EnumIdeaStatusFilter;
    }
    if (filters.minLikes !== undefined) {
      where.likesCount = { gte: filters.minLikes };
    }
    if (filters.minComments !== undefined) {
      where.commentsCount = { gte: filters.minComments };
    }
    if (filters.minViews !== undefined) {
      where.viewsCount = { gte: filters.minViews };
    }
    if (filters.tag) {
      where.tags = { has: filters.tag };
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { teaser: { contains: filters.search, mode: "insensitive" } },
      ];
    }
  }

  return prisma.idea.count({ where });
}
