import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { differenceInDays } from "date-fns";

const childLogger = logger.child({ service: "graduation" });

export class GraduationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "GraduationServiceError";
  }
}

export interface GraduationThresholds {
  graduationVisitors: number;
  graduationCommenters: number;
  graduationLikes: number;
  graduationVoters: number;
  graduationVotingLevel: number;
  graduationDaysInStatus: number;
}

export interface GraduationProgress {
  ideaId: string;
  eligible: boolean;
  thresholds: {
    visitors: { current: number; target: number; met: boolean };
    commenters: { current: number; target: number; met: boolean };
    likes: { current: number; target: number; met: boolean };
    voters: { current: number; target: number; met: boolean };
    votingLevel: { current: number; target: number; met: boolean };
    daysInStatus: { current: number; target: number; met: boolean };
  };
}

/**
 * Get the graduation progress for an idea.
 * Returns each threshold's current vs target and whether it's met.
 */
export async function getGraduationProgress(ideaId: string): Promise<GraduationProgress> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      status: true,
      likesCount: true,
      viewsCount: true,
      campaignId: true,
      updatedAt: true,
      campaign: {
        select: {
          hasCommunityGraduation: true,
          hasDiscussionPhase: true,
          graduationVisitors: true,
          graduationCommenters: true,
          graduationLikes: true,
          graduationVoters: true,
          graduationVotingLevel: true,
          graduationDaysInStatus: true,
        },
      },
    },
  });

  if (!idea) {
    throw new GraduationServiceError("Idea not found", "IDEA_NOT_FOUND");
  }

  const thresholds = idea.campaign;

  // Count unique commenters
  const commenters = await getUniqueCommenters(ideaId);
  // Count unique voters
  const voters = await getUniqueVoters(ideaId);
  // Average voting level
  const votingLevel = await getAverageVotingLevel(ideaId);
  // Days in current status
  const daysInStatus = differenceInDays(new Date(), idea.updatedAt);

  const progress: GraduationProgress = {
    ideaId,
    eligible:
      idea.status === "COMMUNITY_DISCUSSION" &&
      thresholds.hasCommunityGraduation &&
      thresholds.hasDiscussionPhase,
    thresholds: {
      visitors: {
        current: idea.viewsCount,
        target: thresholds.graduationVisitors,
        met:
          thresholds.graduationVisitors === 0 || idea.viewsCount >= thresholds.graduationVisitors,
      },
      commenters: {
        current: commenters,
        target: thresholds.graduationCommenters,
        met: thresholds.graduationCommenters === 0 || commenters >= thresholds.graduationCommenters,
      },
      likes: {
        current: idea.likesCount,
        target: thresholds.graduationLikes,
        met: thresholds.graduationLikes === 0 || idea.likesCount >= thresholds.graduationLikes,
      },
      voters: {
        current: voters,
        target: thresholds.graduationVoters,
        met: thresholds.graduationVoters === 0 || voters >= thresholds.graduationVoters,
      },
      votingLevel: {
        current: votingLevel,
        target: thresholds.graduationVotingLevel,
        met:
          thresholds.graduationVotingLevel === 0 || votingLevel >= thresholds.graduationVotingLevel,
      },
      daysInStatus: {
        current: daysInStatus,
        target: thresholds.graduationDaysInStatus,
        met:
          thresholds.graduationDaysInStatus === 0 ||
          daysInStatus >= thresholds.graduationDaysInStatus,
      },
    },
  };

  return progress;
}

/**
 * Check if an idea meets graduation thresholds and auto-transition to HOT.
 * Called synchronously from EventBus listeners on engagement events.
 */
export async function checkAndGraduateIdea(ideaId: string, actor: string): Promise<boolean> {
  const progress = await getGraduationProgress(ideaId);

  if (!progress.eligible) {
    return false;
  }

  const allMet = Object.values(progress.thresholds).every((t) => t.met);

  if (!allMet) {
    return false;
  }

  // Transition to HOT via the state machine pattern
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      id: true,
      status: true,
      campaignId: true,
      title: true,
      campaign: {
        select: {
          status: true,
          hasDiscussionPhase: true,
          hasQualificationPhase: true,
        },
      },
    },
  });

  if (!idea || idea.status !== "COMMUNITY_DISCUSSION") {
    return false;
  }

  // Verify HOT is a valid target from COMMUNITY_DISCUSSION
  const { isValidIdeaTransition } = await import("@/server/lib/state-machines/idea-transitions");

  const toggles = {
    hasQualificationPhase: idea.campaign.hasQualificationPhase,
    hasDiscussionPhase: idea.campaign.hasDiscussionPhase,
  };

  if (!isValidIdeaTransition("COMMUNITY_DISCUSSION", "HOT", toggles, idea.campaign.status)) {
    childLogger.info(
      { ideaId, campaignStatus: idea.campaign.status },
      "HOT transition not valid for current campaign phase",
    );
    return false;
  }

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      previousStatus: "COMMUNITY_DISCUSSION",
      status: "HOT",
    },
  });

  eventBus.emit("idea.statusChanged", {
    entity: "idea",
    entityId: ideaId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: idea.campaignId,
      previousStatus: "COMMUNITY_DISCUSSION",
      newStatus: "HOT",
      reason: "community_graduation",
    },
  });

  childLogger.info(
    { ideaId, campaignId: idea.campaignId },
    "Idea graduated to HOT via community graduation",
  );

  return true;
}

async function getUniqueCommenters(ideaId: string): Promise<number> {
  const result = await prisma.comment.findMany({
    where: { ideaId },
    select: { authorId: true },
    distinct: ["authorId"],
  });
  return result.length;
}

async function getUniqueVoters(ideaId: string): Promise<number> {
  const result = await prisma.ideaVote.findMany({
    where: { ideaId },
    select: { userId: true },
    distinct: ["userId"],
  });
  return result.length;
}

async function getAverageVotingLevel(ideaId: string): Promise<number> {
  const votes = await prisma.ideaVote.findMany({
    where: { ideaId },
    select: { score: true },
  });

  if (votes.length === 0) return 0;

  const total = votes.reduce((sum, v) => sum + v.score, 0);
  return total / votes.length;
}
