import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  GamificationConfigureInput,
  GamificationGetConfigInput,
  GamificationLeaderboardInput,
  GamificationUserScoreInput,
  GamificationRecalculateInput,
  GamificationResetInput,
} from "./gamification.schemas";

export {
  gamificationConfigureInput,
  gamificationGetConfigInput,
  gamificationLeaderboardInput,
  gamificationUserScoreInput,
  gamificationRecalculateInput,
  gamificationResetInput,
} from "./gamification.schemas";

export type {
  GamificationConfigureInput,
  GamificationGetConfigInput,
  GamificationLeaderboardInput,
  GamificationUserScoreInput,
  GamificationRecalculateInput,
  GamificationResetInput,
} from "./gamification.schemas";

const childLogger = logger.child({ service: "gamification" });

export class GamificationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "GamificationServiceError";
  }
}

/**
 * Configure gamification settings for a campaign.
 * Creates or updates the config.
 */
export async function configureGamification(input: GamificationConfigureInput) {
  childLogger.info({ campaignId: input.campaignId }, "Configuring gamification");

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new GamificationServiceError("Campaign not found", "CAMPAIGN_NOT_FOUND");
  }

  const config = await prisma.gamificationConfig.upsert({
    where: { campaignId: input.campaignId },
    create: {
      campaignId: input.campaignId,
      isActive: input.isActive ?? false,
      ideaWeight: input.ideaWeight ?? 5,
      commentWeight: input.commentWeight ?? 3,
      likeWeight: input.likeWeight ?? 1,
      evaluationWeight: input.evaluationWeight ?? 4,
      showLeaderboard: input.showLeaderboard ?? true,
    },
    update: {
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.ideaWeight !== undefined && { ideaWeight: input.ideaWeight }),
      ...(input.commentWeight !== undefined && { commentWeight: input.commentWeight }),
      ...(input.likeWeight !== undefined && { likeWeight: input.likeWeight }),
      ...(input.evaluationWeight !== undefined && { evaluationWeight: input.evaluationWeight }),
      ...(input.showLeaderboard !== undefined && { showLeaderboard: input.showLeaderboard }),
    },
  });

  eventBus.emit("gamification.configured", {
    entity: "GamificationConfig",
    entityId: config.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId },
  });

  return config;
}

/**
 * Get gamification config for a campaign.
 */
export async function getConfig(input: GamificationGetConfigInput) {
  const config = await prisma.gamificationConfig.findUnique({
    where: { campaignId: input.campaignId },
  });

  return config;
}

type ActivityType = "idea" | "comment" | "like" | "evaluation";

interface RecordActivityInput {
  userId: string;
  campaignId: string;
  activityType: ActivityType;
}

/**
 * Record a user activity and update their score.
 * Called by event listeners when users perform actions.
 */
export async function recordActivity(input: RecordActivityInput) {
  const config = await prisma.gamificationConfig.findUnique({
    where: { campaignId: input.campaignId },
  });

  if (!config || !config.isActive) {
    return null;
  }

  const weightMap: Record<ActivityType, { field: string; weight: number }> = {
    idea: { field: "ideasCount", weight: config.ideaWeight },
    comment: { field: "commentsCount", weight: config.commentWeight },
    like: { field: "likesCount", weight: config.likeWeight },
    evaluation: { field: "evaluationsCount", weight: config.evaluationWeight },
  };

  const activity = weightMap[input.activityType];

  const countIncrement = { [activity.field]: { increment: 1 } };

  const score = await prisma.userScore.upsert({
    where: {
      userId_campaignId: {
        userId: input.userId,
        campaignId: input.campaignId,
      },
    },
    create: {
      userId: input.userId,
      campaignId: input.campaignId,
      [activity.field]: 1,
      totalScore: activity.weight,
    },
    update: {
      ...countIncrement,
      totalScore: { increment: activity.weight },
    },
  });

  childLogger.info(
    { userId: input.userId, campaignId: input.campaignId, activityType: input.activityType },
    "Recorded gamification activity",
  );

  eventBus.emit("gamification.scoreUpdated", {
    entity: "UserScore",
    entityId: score.id,
    actor: input.userId,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: input.campaignId,
      activityType: input.activityType,
      totalScore: score.totalScore,
    },
  });

  return score;
}

/**
 * Get the leaderboard for a campaign, ranked by total score.
 */
export async function getLeaderboard(input: GamificationLeaderboardInput) {
  const config = await prisma.gamificationConfig.findUnique({
    where: { campaignId: input.campaignId },
  });

  if (!config) {
    throw new GamificationServiceError(
      "Gamification not configured for this campaign",
      "CONFIG_NOT_FOUND",
    );
  }

  const scores = await prisma.userScore.findMany({
    where: { campaignId: input.campaignId },
    orderBy: { totalScore: "desc" },
    take: input.limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  // Apply dense ranking
  let currentRank = 0;
  let previousScore: number | null = null;

  const rankedScores = scores.map((score) => {
    if (score.totalScore !== previousScore) {
      currentRank++;
    }
    previousScore = score.totalScore;
    return {
      ...score,
      rank: currentRank,
      updatedAt: score.updatedAt.toISOString(),
    };
  });

  return {
    items: rankedScores,
    campaignId: input.campaignId,
    showLeaderboard: config.showLeaderboard,
  };
}

/**
 * Get individual user score and rank for a campaign.
 */
export async function getUserScore(input: GamificationUserScoreInput) {
  const score = await prisma.userScore.findUnique({
    where: {
      userId_campaignId: {
        userId: input.userId,
        campaignId: input.campaignId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!score) {
    return null;
  }

  // Calculate rank based on how many users have a higher score
  const higherCount = await prisma.userScore.count({
    where: {
      campaignId: input.campaignId,
      totalScore: { gt: score.totalScore },
    },
  });

  return {
    ...score,
    rank: higherCount + 1,
    updatedAt: score.updatedAt.toISOString(),
  };
}

/**
 * Full recalculation of all scores for a campaign from activity history.
 */
export async function recalculateScores(input: GamificationRecalculateInput) {
  childLogger.info({ campaignId: input.campaignId }, "Recalculating gamification scores");

  const config = await prisma.gamificationConfig.findUnique({
    where: { campaignId: input.campaignId },
  });

  if (!config) {
    throw new GamificationServiceError(
      "Gamification not configured for this campaign",
      "CONFIG_NOT_FOUND",
    );
  }

  // Get all users who have contributed to this campaign
  const [ideas, comments, likes, evaluations] = await Promise.all([
    prisma.idea.groupBy({
      by: ["contributorId"],
      where: { campaignId: input.campaignId },
      _count: { id: true },
    }),
    prisma.comment.groupBy({
      by: ["authorId"],
      where: { idea: { campaignId: input.campaignId } },
      _count: { id: true },
    }),
    prisma.ideaLike.groupBy({
      by: ["userId"],
      where: { idea: { campaignId: input.campaignId } },
      _count: { id: true },
    }),
    prisma.evaluationResponse.groupBy({
      by: ["evaluatorId"],
      where: { session: { campaignId: input.campaignId } },
      _count: { id: true },
    }),
  ]);

  // Aggregate per user
  const userMap = new Map<
    string,
    { ideas: number; comments: number; likes: number; evaluations: number }
  >();

  for (const item of ideas) {
    const existing = userMap.get(item.contributorId) ?? {
      ideas: 0,
      comments: 0,
      likes: 0,
      evaluations: 0,
    };
    existing.ideas = item._count.id;
    userMap.set(item.contributorId, existing);
  }

  for (const item of comments) {
    const existing = userMap.get(item.authorId) ?? {
      ideas: 0,
      comments: 0,
      likes: 0,
      evaluations: 0,
    };
    existing.comments = item._count.id;
    userMap.set(item.authorId, existing);
  }

  for (const item of likes) {
    const existing = userMap.get(item.userId) ?? {
      ideas: 0,
      comments: 0,
      likes: 0,
      evaluations: 0,
    };
    existing.likes = item._count.id;
    userMap.set(item.userId, existing);
  }

  for (const item of evaluations) {
    const existing = userMap.get(item.evaluatorId) ?? {
      ideas: 0,
      comments: 0,
      likes: 0,
      evaluations: 0,
    };
    existing.evaluations = item._count.id;
    userMap.set(item.evaluatorId, existing);
  }

  // Delete existing scores and recreate
  await prisma.userScore.deleteMany({
    where: { campaignId: input.campaignId },
  });

  const upserts = Array.from(userMap.entries()).map(([userId, counts]) => {
    const totalScore =
      counts.ideas * config.ideaWeight +
      counts.comments * config.commentWeight +
      counts.likes * config.likeWeight +
      counts.evaluations * config.evaluationWeight;

    return prisma.userScore.create({
      data: {
        userId,
        campaignId: input.campaignId,
        ideasCount: counts.ideas,
        commentsCount: counts.comments,
        likesCount: counts.likes,
        evaluationsCount: counts.evaluations,
        totalScore,
      },
    });
  });

  await Promise.all(upserts);

  childLogger.info(
    { campaignId: input.campaignId, usersRecalculated: userMap.size },
    "Gamification scores recalculated",
  );

  eventBus.emit("gamification.leaderboardChanged", {
    entity: "Campaign",
    entityId: input.campaignId,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: { usersRecalculated: userMap.size },
  });

  return { usersRecalculated: userMap.size };
}

/**
 * Reset all scores for a campaign.
 */
export async function resetScores(input: GamificationResetInput) {
  childLogger.info({ campaignId: input.campaignId }, "Resetting gamification scores");

  const result = await prisma.userScore.deleteMany({
    where: { campaignId: input.campaignId },
  });

  eventBus.emit("gamification.leaderboardChanged", {
    entity: "Campaign",
    entityId: input.campaignId,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: { scoresDeleted: result.count },
  });

  return { scoresDeleted: result.count };
}
