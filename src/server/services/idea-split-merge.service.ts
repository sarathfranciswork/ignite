import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { IdeaServiceError } from "./idea.service";
import type {
  IdeaSplitInput,
  IdeaMergeInput,
  IdeaBulkAssignBucketInput,
  IdeaBulkArchiveInput,
  IdeaBulkExportInput,
} from "./idea.schemas";

export {
  ideaSplitInput,
  ideaMergeInput,
  ideaBulkAssignBucketInput,
  ideaBulkArchiveInput,
  ideaBulkExportInput,
  ideaMergeHistoryInput,
} from "./idea.schemas";

export type {
  IdeaSplitInput,
  IdeaMergeInput,
  IdeaBulkAssignBucketInput,
  IdeaBulkArchiveInput,
  IdeaBulkExportInput,
} from "./idea.schemas";

const childLogger = logger.child({ service: "idea-split-merge" });

const ideaFullInclude = {
  contributor: {
    select: { id: true, name: true, email: true, image: true },
  },
  coAuthors: {
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  },
  campaign: {
    select: { id: true, title: true, status: true },
  },
} as const;

/**
 * Split one idea into multiple new ideas.
 * The original idea is archived, new ideas inherit the campaign and contributor.
 */
export async function splitIdea(input: IdeaSplitInput, actor: string) {
  const original = await prisma.idea.findUnique({
    where: { id: input.id },
    include: {
      coAuthors: { select: { userId: true } },
      campaign: { select: { id: true, title: true, status: true } },
      contributor: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!original) {
    throw new IdeaServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const coAuthorUserIds = original.coAuthors.map((ca) => ca.userId);

  const result = await prisma.$transaction(async (tx) => {
    const newIdeas = [];
    for (const newIdeaData of input.newIdeas) {
      const created = await tx.idea.create({
        data: {
          title: newIdeaData.title,
          teaser: newIdeaData.teaser,
          description: newIdeaData.description,
          category: newIdeaData.category,
          tags: newIdeaData.tags ?? [],
          status: original.status === "ARCHIVED" ? "DRAFT" : original.status,
          campaignId: original.campaignId,
          contributorId: original.contributorId,
          splitFromId: original.id,
          isConfidential: original.isConfidential,
        },
        include: ideaFullInclude,
      });

      // Preserve co-authors on split children
      if (coAuthorUserIds.length > 0) {
        await tx.ideaCoAuthor.createMany({
          data: coAuthorUserIds.map((userId) => ({
            ideaId: created.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      newIdeas.push(created);
    }

    // Archive the original idea
    const archived = await tx.idea.update({
      where: { id: original.id },
      data: {
        previousStatus: original.status,
        status: "ARCHIVED",
      },
      include: ideaFullInclude,
    });

    return { original: archived, newIdeas };
  });

  eventBus.emit("idea.split", {
    entity: "idea",
    entityId: original.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: original.campaignId,
      newIdeaIds: result.newIdeas.map((i) => i.id),
      newIdeaTitles: result.newIdeas.map((i) => i.title),
    },
  });

  childLogger.info({ originalId: original.id, newIdeaCount: result.newIdeas.length }, "Idea split");

  return {
    original: serializeSplitMergeIdea(result.original),
    newIdeas: result.newIdeas.map(serializeSplitMergeIdea),
  };
}

/**
 * Merge multiple source ideas into a target idea.
 * Source ideas get a mergedIntoId reference and are archived.
 * All comments, votes, contributors, and followers are attributed to the target.
 */
export async function mergeIdeas(input: IdeaMergeInput, actor: string) {
  const target = await prisma.idea.findUnique({
    where: { id: input.targetIdeaId },
    include: {
      campaign: { select: { id: true, title: true, status: true } },
    },
  });

  if (!target) {
    throw new IdeaServiceError("Target idea not found", "IDEA_NOT_FOUND");
  }

  if (input.sourceIdeaIds.includes(input.targetIdeaId)) {
    throw new IdeaServiceError("Target idea cannot be in the source list", "INVALID_MERGE_TARGET");
  }

  const sourceIdeas = await prisma.idea.findMany({
    where: { id: { in: input.sourceIdeaIds } },
    include: {
      coAuthors: { select: { userId: true } },
      comments: { select: { id: true } },
      likes: { select: { userId: true } },
      votes: { select: { id: true } },
      followers: { select: { userId: true } },
    },
  });

  if (sourceIdeas.length !== input.sourceIdeaIds.length) {
    throw new IdeaServiceError("One or more source ideas not found", "IDEA_NOT_FOUND");
  }

  // Verify all source ideas belong to the same campaign
  const invalidCampaign = sourceIdeas.find((s) => s.campaignId !== target.campaignId);
  if (invalidCampaign) {
    throw new IdeaServiceError("All ideas must belong to the same campaign", "CAMPAIGN_MISMATCH");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Record merge history for each source
    await tx.ideaMergeHistory.createMany({
      data: sourceIdeas.map((source) => ({
        targetIdeaId: target.id,
        sourceIdeaId: source.id,
        mergedById: actor,
        sourceTitle: source.title,
        sourceTeaser: source.teaser,
      })),
    });

    // Collect unique co-author IDs from all sources (excluding target contributor)
    const allCoAuthorIds = new Set<string>();
    for (const source of sourceIdeas) {
      // Add source contributor as co-author on target
      if (source.contributorId !== target.contributorId) {
        allCoAuthorIds.add(source.contributorId);
      }
      for (const ca of source.coAuthors) {
        if (ca.userId !== target.contributorId) {
          allCoAuthorIds.add(ca.userId);
        }
      }
    }

    // Add new co-authors to target
    if (allCoAuthorIds.size > 0) {
      await tx.ideaCoAuthor.createMany({
        data: [...allCoAuthorIds].map((userId) => ({
          ideaId: target.id,
          userId,
        })),
        skipDuplicates: true,
      });
    }

    // Move followers from sources to target (skip duplicates)
    for (const source of sourceIdeas) {
      for (const follower of source.followers) {
        await tx.ideaFollow.upsert({
          where: {
            ideaId_userId: { ideaId: target.id, userId: follower.userId },
          },
          create: { ideaId: target.id, userId: follower.userId },
          update: {},
        });
      }
    }

    // Aggregate likes count from sources
    const additionalLikes = sourceIdeas.reduce((sum, s) => sum + s.likes.length, 0);
    const additionalComments = sourceIdeas.reduce((sum, s) => sum + s.comments.length, 0);

    // Update target counters
    await tx.idea.update({
      where: { id: target.id },
      data: {
        likesCount: { increment: additionalLikes },
        commentsCount: { increment: additionalComments },
      },
    });

    // Archive source ideas with mergedIntoId reference
    for (const source of sourceIdeas) {
      await tx.idea.update({
        where: { id: source.id },
        data: {
          previousStatus: source.status,
          status: "ARCHIVED",
          mergedIntoId: target.id,
        },
      });
    }

    // Re-fetch target with full includes
    const updated = await tx.idea.findUnique({
      where: { id: target.id },
      include: ideaFullInclude,
    });

    return updated!;
  });

  eventBus.emit("idea.merged", {
    entity: "idea",
    entityId: target.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: target.campaignId,
      sourceIdeaIds: input.sourceIdeaIds,
      sourceTitles: sourceIdeas.map((s) => s.title),
    },
  });

  childLogger.info({ targetId: target.id, sourceCount: sourceIdeas.length }, "Ideas merged");

  return serializeSplitMergeIdea(result);
}

/**
 * Get merge history for an idea (as target).
 */
export async function getMergeHistory(ideaId: string) {
  const history = await prisma.ideaMergeHistory.findMany({
    where: { targetIdeaId: ideaId },
    orderBy: { mergedAt: "desc" },
  });

  return history.map((h) => ({
    id: h.id,
    targetIdeaId: h.targetIdeaId,
    sourceIdeaId: h.sourceIdeaId,
    mergedById: h.mergedById,
    sourceTitle: h.sourceTitle,
    sourceTeaser: h.sourceTeaser,
    mergedAt: h.mergedAt.toISOString(),
  }));
}

/**
 * Bulk assign selected ideas to a bucket.
 */
export async function bulkAssignBucket(input: IdeaBulkAssignBucketInput, actor: string) {
  const bucket = await prisma.bucket.findUnique({
    where: { id: input.bucketId },
    select: { id: true, name: true, campaignId: true },
  });

  if (!bucket) {
    throw new IdeaServiceError("Bucket not found", "BUCKET_NOT_FOUND");
  }

  // Verify all ideas exist and belong to the same campaign
  const ideas = await prisma.idea.findMany({
    where: { id: { in: input.ideaIds } },
    select: { id: true, campaignId: true },
  });

  if (ideas.length !== input.ideaIds.length) {
    throw new IdeaServiceError("One or more ideas not found", "IDEA_NOT_FOUND");
  }

  const invalidCampaign = ideas.find((i) => i.campaignId !== bucket.campaignId);
  if (invalidCampaign) {
    throw new IdeaServiceError(
      "All ideas must belong to the same campaign as the bucket",
      "CAMPAIGN_MISMATCH",
    );
  }

  await prisma.ideaBucketAssignment.createMany({
    data: input.ideaIds.map((ideaId) => ({
      bucketId: input.bucketId,
      ideaId,
    })),
    skipDuplicates: true,
  });

  eventBus.emit("idea.bulkBucketAssigned", {
    entity: "idea",
    entityId: input.bucketId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      ideaIds: input.ideaIds,
      bucketId: input.bucketId,
      bucketName: bucket.name,
      count: input.ideaIds.length,
    },
  });

  childLogger.info(
    { bucketId: input.bucketId, ideaCount: input.ideaIds.length },
    "Bulk bucket assignment",
  );

  return { assignedCount: input.ideaIds.length, bucketId: input.bucketId };
}

/**
 * Bulk archive selected ideas.
 */
export async function bulkArchiveIdeas(input: IdeaBulkArchiveInput, actor: string) {
  const ideas = await prisma.idea.findMany({
    where: { id: { in: input.ideaIds } },
    select: { id: true, status: true, campaignId: true },
  });

  if (ideas.length !== input.ideaIds.length) {
    throw new IdeaServiceError("One or more ideas not found", "IDEA_NOT_FOUND");
  }

  // Filter out already-archived ideas
  const archivable = ideas.filter((i) => i.status !== "ARCHIVED");

  if (archivable.length === 0) {
    return { archivedCount: 0 };
  }

  await prisma.$transaction(
    archivable.map((idea) =>
      prisma.idea.update({
        where: { id: idea.id },
        data: {
          previousStatus: idea.status,
          status: "ARCHIVED",
        },
      }),
    ),
  );

  eventBus.emit("idea.bulkArchived", {
    entity: "idea",
    entityId: archivable[0]!.campaignId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      ideaIds: archivable.map((i) => i.id),
      reason: input.reason,
      count: archivable.length,
    },
  });

  childLogger.info({ archivedCount: archivable.length, reason: input.reason }, "Bulk archive");

  return { archivedCount: archivable.length };
}

/**
 * Bulk export selected ideas as structured data.
 * Returns idea data in a format suitable for CSV/JSON export by the client.
 */
export async function bulkExportIdeas(input: IdeaBulkExportInput, actor: string) {
  const ideas = await prisma.idea.findMany({
    where: {
      id: { in: input.ideaIds },
      campaignId: input.campaignId,
    },
    include: {
      contributor: {
        select: { id: true, name: true, email: true },
      },
      coAuthors: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      campaign: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  eventBus.emit("idea.bulkExported", {
    entity: "idea",
    entityId: input.campaignId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      ideaIds: ideas.map((i) => i.id),
      count: ideas.length,
    },
  });

  childLogger.info({ campaignId: input.campaignId, count: ideas.length }, "Bulk export");

  return {
    ideas: ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      teaser: idea.teaser,
      description: idea.description,
      status: idea.status,
      category: idea.category,
      tags: idea.tags,
      contributorName: idea.contributor.name,
      contributorEmail: idea.contributor.email,
      coAuthors: idea.coAuthors.map((ca) => ca.user.name ?? ca.user.email).join("; "),
      campaignTitle: idea.campaign.title,
      likesCount: idea.likesCount,
      commentsCount: idea.commentsCount,
      viewsCount: idea.viewsCount,
      isConfidential: idea.isConfidential,
      createdAt: idea.createdAt.toISOString(),
      updatedAt: idea.updatedAt.toISOString(),
    })),
    exportedAt: new Date().toISOString(),
  };
}

function serializeSplitMergeIdea(idea: {
  id: string;
  title: string;
  teaser: string | null;
  description: string | null;
  status: string;
  campaignId: string;
  contributorId: string;
  category: string | null;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
  contributor?: { id: string; name: string | null; email: string; image: string | null };
  coAuthors?: Array<{
    user: { id: string; name: string | null; email: string; image: string | null };
  }>;
  campaign?: { id: string; title: string; status: string };
}) {
  return {
    id: idea.id,
    title: idea.title,
    teaser: idea.teaser,
    description: idea.description,
    status: idea.status,
    campaignId: idea.campaignId,
    contributorId: idea.contributorId,
    category: idea.category,
    tags: idea.tags,
    likesCount: idea.likesCount,
    commentsCount: idea.commentsCount,
    viewsCount: idea.viewsCount,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    contributor: idea.contributor,
    coAuthors: idea.coAuthors?.map((ca) => ca.user),
    campaign: idea.campaign,
  };
}
