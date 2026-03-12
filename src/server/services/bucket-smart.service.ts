import { prisma } from "@/server/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  BucketServiceError,
  type BucketListIdeasInput,
  type BucketSidebarInput,
  type SmartBucketFilterCriteria,
} from "./bucket.schemas";

// ── Shared Filter Builder ───────────────────────────────────

export function buildSmartBucketWhereClause(
  campaignId: string,
  filterCriteria: unknown,
): Prisma.IdeaWhereInput {
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

  return where;
}

// ── Smart Bucket Evaluation ─────────────────────────────────

export async function evaluateSmartBucket(
  _bucketId: string,
  campaignId: string,
  filterCriteria: unknown,
  input: BucketListIdeasInput,
) {
  const where = buildSmartBucketWhereClause(campaignId, filterCriteria);

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

// ── Smart Bucket Count ──────────────────────────────────────

export async function getSmartBucketCount(
  campaignId: string,
  filterCriteria: unknown,
): Promise<number> {
  const where = buildSmartBucketWhereClause(campaignId, filterCriteria);
  return prisma.idea.count({ where });
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
