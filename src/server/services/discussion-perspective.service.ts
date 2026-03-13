import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { ThinkingHatPerspective } from "@prisma/client";
import type {
  PerspectiveSetInput,
  PerspectiveGetInput,
  PerspectivesByIdeaInput,
  PerspectiveDistributionInput,
  PerspectiveRemoveInput,
} from "./gamification.schemas";

export {
  perspectiveSetInput,
  perspectiveGetInput,
  perspectivesByIdeaInput,
  perspectiveDistributionInput,
  perspectiveRemoveInput,
} from "./gamification.schemas";

export type {
  PerspectiveSetInput,
  PerspectiveGetInput,
  PerspectivesByIdeaInput,
  PerspectiveDistributionInput,
  PerspectiveRemoveInput,
} from "./gamification.schemas";

const childLogger = logger.child({ service: "discussion-perspective" });

export class PerspectiveServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PerspectiveServiceError";
  }
}

/**
 * Set or update a thinking hat perspective on a comment.
 * One perspective per comment (upsert).
 */
export async function setPerspective(input: PerspectiveSetInput) {
  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
    select: { id: true, ideaId: true },
  });

  if (!comment) {
    throw new PerspectiveServiceError("Comment not found", "COMMENT_NOT_FOUND");
  }

  const perspective = await prisma.discussionPerspective.upsert({
    where: { commentId: input.commentId },
    create: {
      commentId: input.commentId,
      perspective: input.perspective as ThinkingHatPerspective,
    },
    update: {
      perspective: input.perspective as ThinkingHatPerspective,
    },
  });

  childLogger.info(
    { commentId: input.commentId, perspective: input.perspective },
    "Perspective set on comment",
  );

  eventBus.emit("perspective.set", {
    entity: "DiscussionPerspective",
    entityId: perspective.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: { commentId: input.commentId, perspective: input.perspective },
  });

  return perspective;
}

/**
 * Get the perspective for a specific comment.
 */
export async function getPerspective(input: PerspectiveGetInput) {
  const perspective = await prisma.discussionPerspective.findUnique({
    where: { commentId: input.commentId },
  });

  return perspective;
}

/**
 * Get all comments with a specific perspective for an idea.
 */
export async function getCommentsByPerspective(input: PerspectivesByIdeaInput) {
  const comments = await prisma.comment.findMany({
    where: {
      ideaId: input.ideaId,
      perspective: {
        perspective: input.perspective as ThinkingHatPerspective,
      },
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      perspective: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    ideaId: comment.ideaId,
    authorId: comment.authorId,
    author: comment.author,
    perspective: comment.perspective,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }));
}

/**
 * Get the distribution of perspectives for comments on an idea.
 */
export async function getPerspectiveDistribution(input: PerspectiveDistributionInput) {
  const commentIds = await prisma.comment.findMany({
    where: { ideaId: input.ideaId },
    select: { id: true },
  });

  const ids = commentIds.map((c) => c.id);

  if (ids.length === 0) {
    return {
      ideaId: input.ideaId,
      totalComments: 0,
      withPerspective: 0,
      distribution: [],
    };
  }

  const perspectives = await prisma.discussionPerspective.groupBy({
    by: ["perspective"],
    where: { commentId: { in: ids } },
    _count: { id: true },
  });

  const distribution = perspectives.map((p) => ({
    perspective: p.perspective,
    count: p._count.id,
  }));

  const withPerspective = distribution.reduce((acc, d) => acc + d.count, 0);

  return {
    ideaId: input.ideaId,
    totalComments: ids.length,
    withPerspective,
    distribution,
  };
}

/**
 * Remove the perspective tag from a comment.
 */
export async function removePerspective(input: PerspectiveRemoveInput) {
  const existing = await prisma.discussionPerspective.findUnique({
    where: { commentId: input.commentId },
  });

  if (!existing) {
    throw new PerspectiveServiceError(
      "No perspective set on this comment",
      "PERSPECTIVE_NOT_FOUND",
    );
  }

  await prisma.discussionPerspective.delete({
    where: { commentId: input.commentId },
  });

  childLogger.info({ commentId: input.commentId }, "Perspective removed from comment");

  eventBus.emit("perspective.removed", {
    entity: "DiscussionPerspective",
    entityId: existing.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: { commentId: input.commentId },
  });

  return { deleted: true };
}
