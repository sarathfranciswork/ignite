import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  LikeToggleInput,
  VoteUpsertInput,
  VoteDeleteInput,
  VoteGetInput,
  FollowToggleInput,
} from "./engagement.schemas";

export {
  likeToggleInput,
  likeStatusInput,
  voteUpsertInput,
  voteDeleteInput,
  voteGetInput,
  followToggleInput,
  followStatusInput,
} from "./engagement.schemas";

export type {
  LikeToggleInput,
  LikeStatusInput,
  VoteUpsertInput,
  VoteDeleteInput,
  VoteGetInput,
  FollowToggleInput,
  FollowStatusInput,
} from "./engagement.schemas";

const childLogger = logger.child({ service: "engagement" });

export class EngagementServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "EngagementServiceError";
  }
}

// ── Like Functions ──────────────────────────────────────────

/**
 * Toggle a like on an idea. Returns the new liked state.
 * Uses optimistic denormalized counter on Idea.likesCount.
 */
export async function toggleLike(input: LikeToggleInput, userId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: {
      id: true,
      campaignId: true,
      campaign: { select: { hasLikes: true } },
    },
  });

  if (!idea) {
    throw new EngagementServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (!idea.campaign.hasLikes) {
    throw new EngagementServiceError("Likes are disabled for this campaign", "LIKES_DISABLED");
  }

  const existing = await prisma.ideaLike.findUnique({
    where: { ideaId_userId: { ideaId: input.ideaId, userId } },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.ideaLike.delete({
        where: { ideaId_userId: { ideaId: input.ideaId, userId } },
      });
      await tx.idea.update({
        where: { id: input.ideaId },
        data: { likesCount: { decrement: 1 } },
      });
    });

    eventBus.emit("idea.unliked", {
      entity: "idea",
      entityId: input.ideaId,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: { campaignId: idea.campaignId },
    });

    childLogger.info({ ideaId: input.ideaId, userId }, "Idea unliked");

    return { liked: false, likesCount: await getLikesCount(input.ideaId) };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ideaLike.create({
      data: { ideaId: input.ideaId, userId },
    });
    await tx.idea.update({
      where: { id: input.ideaId },
      data: { likesCount: { increment: 1 } },
    });
  });

  eventBus.emit("idea.liked", {
    entity: "idea",
    entityId: input.ideaId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: idea.campaignId },
  });

  childLogger.info({ ideaId: input.ideaId, userId }, "Idea liked");

  return { liked: true, likesCount: await getLikesCount(input.ideaId) };
}

/**
 * Get whether the current user has liked an idea.
 */
export async function getLikeStatus(ideaId: string, userId: string) {
  const like = await prisma.ideaLike.findUnique({
    where: { ideaId_userId: { ideaId, userId } },
  });

  return { liked: !!like };
}

async function getLikesCount(ideaId: string): Promise<number> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { likesCount: true },
  });
  return idea?.likesCount ?? 0;
}

// ── Vote Functions ──────────────────────────────────────────

/**
 * Create or update a vote on an idea for a specific criterion.
 * One vote per user per idea per criterion (1-5 star scale).
 */
export async function upsertVote(input: VoteUpsertInput, userId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: {
      id: true,
      campaignId: true,
      campaign: { select: { hasVoting: true, votingCriteria: true } },
    },
  });

  if (!idea) {
    throw new EngagementServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  if (!idea.campaign.hasVoting) {
    throw new EngagementServiceError("Voting is disabled for this campaign", "VOTING_DISABLED");
  }

  const criteria = parseCriteria(idea.campaign.votingCriteria);
  if (criteria.length > 0) {
    const validCriterion = criteria.some((c) => c.id === input.criterionId);
    if (!validCriterion) {
      throw new EngagementServiceError("Invalid voting criterion", "INVALID_CRITERION");
    }
  }

  const existing = await prisma.ideaVote.findUnique({
    where: {
      ideaId_userId_criterionId: {
        ideaId: input.ideaId,
        userId,
        criterionId: input.criterionId,
      },
    },
  });

  const vote = await prisma.ideaVote.upsert({
    where: {
      ideaId_userId_criterionId: {
        ideaId: input.ideaId,
        userId,
        criterionId: input.criterionId,
      },
    },
    create: {
      ideaId: input.ideaId,
      userId,
      criterionId: input.criterionId,
      score: input.score,
    },
    update: {
      score: input.score,
    },
  });

  const isNew = !existing;
  if (isNew) {
    eventBus.emit("idea.voted", {
      entity: "idea",
      entityId: input.ideaId,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: {
        campaignId: idea.campaignId,
        criterionId: input.criterionId,
        score: input.score,
      },
    });
  }

  childLogger.info(
    { ideaId: input.ideaId, criterionId: input.criterionId, score: input.score },
    isNew ? "Vote created" : "Vote updated",
  );

  return {
    id: vote.id,
    ideaId: vote.ideaId,
    criterionId: vote.criterionId,
    score: vote.score,
    createdAt: vote.createdAt.toISOString(),
    updatedAt: vote.updatedAt.toISOString(),
  };
}

/**
 * Remove a vote on an idea for a specific criterion.
 */
export async function deleteVote(input: VoteDeleteInput, userId: string) {
  const existing = await prisma.ideaVote.findUnique({
    where: {
      ideaId_userId_criterionId: {
        ideaId: input.ideaId,
        userId,
        criterionId: input.criterionId,
      },
    },
  });

  if (!existing) {
    throw new EngagementServiceError("Vote not found", "VOTE_NOT_FOUND");
  }

  await prisma.ideaVote.delete({
    where: {
      ideaId_userId_criterionId: {
        ideaId: input.ideaId,
        userId,
        criterionId: input.criterionId,
      },
    },
  });

  childLogger.info(
    { ideaId: input.ideaId, criterionId: input.criterionId },
    "Vote deleted",
  );

  return { ideaId: input.ideaId, criterionId: input.criterionId };
}

/**
 * Get all votes for an idea, including aggregate stats per criterion.
 */
export async function getIdeaVotes(input: VoteGetInput, userId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: {
      id: true,
      campaign: { select: { hasVoting: true, votingCriteria: true } },
    },
  });

  if (!idea) {
    throw new EngagementServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const criteria = parseCriteria(idea.campaign.votingCriteria);

  const userVotes = await prisma.ideaVote.findMany({
    where: { ideaId: input.ideaId, userId },
  });

  const allVotes = await prisma.ideaVote.findMany({
    where: { ideaId: input.ideaId },
    select: { criterionId: true, score: true },
  });

  const aggregateMap = new Map<string, { total: number; count: number }>();
  for (const v of allVotes) {
    const agg = aggregateMap.get(v.criterionId) ?? { total: 0, count: 0 };
    agg.total += v.score;
    agg.count += 1;
    aggregateMap.set(v.criterionId, agg);
  }

  const criteriaStats = (criteria.length > 0 ? criteria : [{ id: "overall", label: "Overall" }]).map(
    (c) => {
      const agg = aggregateMap.get(c.id);
      const userVote = userVotes.find((v) => v.criterionId === c.id);
      return {
        criterionId: c.id,
        label: c.label,
        averageScore: agg ? agg.total / agg.count : 0,
        totalVoters: agg?.count ?? 0,
        userScore: userVote?.score ?? null,
      };
    },
  );

  return {
    ideaId: input.ideaId,
    hasVoting: idea.campaign.hasVoting,
    criteria: criteriaStats,
    totalVoters: new Set(allVotes.map(() => "counted")).size > 0
      ? new Set(
          (await prisma.ideaVote.findMany({
            where: { ideaId: input.ideaId },
            select: { userId: true },
            distinct: ["userId"],
          })).map((v) => v.userId),
        ).size
      : 0,
  };
}

// ── Follow Functions ────────────────────────────────────────

/**
 * Toggle follow/subscribe on an idea. Returns the new follow state.
 */
export async function toggleFollow(input: FollowToggleInput, userId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: { id: true, campaignId: true },
  });

  if (!idea) {
    throw new EngagementServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const existing = await prisma.ideaFollow.findUnique({
    where: { ideaId_userId: { ideaId: input.ideaId, userId } },
  });

  if (existing) {
    await prisma.ideaFollow.delete({
      where: { ideaId_userId: { ideaId: input.ideaId, userId } },
    });

    eventBus.emit("idea.unfollowed", {
      entity: "idea",
      entityId: input.ideaId,
      actor: userId,
      timestamp: new Date().toISOString(),
      metadata: { campaignId: idea.campaignId },
    });

    childLogger.info({ ideaId: input.ideaId, userId }, "Idea unfollowed");

    return { following: false };
  }

  await prisma.ideaFollow.create({
    data: { ideaId: input.ideaId, userId },
  });

  eventBus.emit("idea.followed", {
    entity: "idea",
    entityId: input.ideaId,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: idea.campaignId },
  });

  childLogger.info({ ideaId: input.ideaId, userId }, "Idea followed");

  return { following: true };
}

/**
 * Get whether the current user follows an idea.
 */
export async function getFollowStatus(ideaId: string, userId: string) {
  const follow = await prisma.ideaFollow.findUnique({
    where: { ideaId_userId: { ideaId, userId } },
  });

  return { following: !!follow };
}

// ── Helpers ─────────────────────────────────────────────────

interface VotingCriterion {
  id: string;
  label: string;
}

function parseCriteria(votingCriteria: unknown): VotingCriterion[] {
  if (!votingCriteria || !Array.isArray(votingCriteria)) {
    return [];
  }
  return votingCriteria.filter(
    (c): c is VotingCriterion =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as Record<string, unknown>).id === "string" &&
      typeof (c as Record<string, unknown>).label === "string",
  );
}
