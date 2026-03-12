import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { IdeaStatus, ShortlistForwardTarget } from "@prisma/client";
import { transitionIdea } from "./idea.service";
import {
  EvaluationServiceError,
  type ShortlistAddItemInput,
  type ShortlistRemoveItemInput,
  type ShortlistLockInput,
  type ShortlistGetInput,
  type ShortlistForwardInput,
  type ShortlistForwardAllInput,
} from "./evaluation.schemas";

const childLogger = logger.child({ service: "shortlist" });

// Map forward target to idea target status for state machine transitions
const FORWARD_TARGET_STATUS_MAP: Record<ShortlistForwardTarget, IdeaStatus> = {
  SELECTED_IMPLEMENTATION: "SELECTED_IMPLEMENTATION",
  CONCEPT: "EVALUATION",
  ARCHIVED: "ARCHIVED",
};

export async function getShortlist(input: ShortlistGetInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      shortlistLocked: true,
      shortlistLockedAt: true,
      shortlistLockedById: true,
      shortlistItems: {
        include: {
          idea: {
            select: { id: true, title: true, teaser: true, status: true },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  return {
    sessionId: session.id,
    isLocked: session.shortlistLocked,
    lockedAt: session.shortlistLockedAt?.toISOString() ?? null,
    lockedById: session.shortlistLockedById,
    items: session.shortlistItems.map((item) => ({
      id: item.id,
      ideaId: item.ideaId,
      ideaTitle: item.idea.title,
      ideaTeaser: item.idea.teaser,
      ideaStatus: item.idea.status,
      addedById: item.addedById,
      addedAt: item.addedAt.toISOString(),
      forwardedTo: item.forwardedTo,
      forwardedAt: item.forwardedAt?.toISOString() ?? null,
    })),
  };
}

export async function addToShortlist(input: ShortlistAddItemInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.shortlistLocked) {
    throw new EvaluationServiceError("Shortlist is locked", "SHORTLIST_LOCKED");
  }

  const sessionIdea = await prisma.evaluationSessionIdea.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (!sessionIdea) {
    throw new EvaluationServiceError("Idea not found in this session", "IDEA_NOT_IN_SESSION");
  }

  const existing = await prisma.evaluationShortlistItem.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (existing) {
    return { added: false, alreadyExists: true };
  }

  await prisma.evaluationShortlistItem.create({
    data: {
      sessionId: input.sessionId,
      ideaId: input.ideaId,
      addedById: actor,
    },
  });

  eventBus.emit("evaluation.shortlistItemAdded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, ideaId: input.ideaId },
  });

  childLogger.info({ sessionId: input.sessionId, ideaId: input.ideaId }, "Idea added to shortlist");

  return { added: true, alreadyExists: false };
}

export async function removeFromShortlist(input: ShortlistRemoveItemInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.shortlistLocked) {
    throw new EvaluationServiceError("Shortlist is locked", "SHORTLIST_LOCKED");
  }

  const item = await prisma.evaluationShortlistItem.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (!item) {
    throw new EvaluationServiceError("Idea not in shortlist", "NOT_IN_SHORTLIST");
  }

  await prisma.evaluationShortlistItem.delete({ where: { id: item.id } });

  eventBus.emit("evaluation.shortlistItemRemoved", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId, ideaId: input.ideaId },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId },
    "Idea removed from shortlist",
  );

  return { removed: true };
}

export async function lockShortlist(input: ShortlistLockInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (session.shortlistLocked) {
    throw new EvaluationServiceError("Shortlist is already locked", "SHORTLIST_ALREADY_LOCKED");
  }

  await prisma.evaluationSession.update({
    where: { id: input.sessionId },
    data: {
      shortlistLocked: true,
      shortlistLockedAt: new Date(),
      shortlistLockedById: actor,
    },
  });

  eventBus.emit("evaluation.shortlistLocked", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: session.campaignId },
  });

  childLogger.info({ sessionId: input.sessionId }, "Shortlist locked");

  return { locked: true };
}

export async function forwardShortlistItem(input: ShortlistForwardInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (!session.shortlistLocked) {
    throw new EvaluationServiceError(
      "Shortlist must be locked before forwarding",
      "SHORTLIST_NOT_LOCKED",
    );
  }

  const item = await prisma.evaluationShortlistItem.findUnique({
    where: {
      sessionId_ideaId: { sessionId: input.sessionId, ideaId: input.ideaId },
    },
  });

  if (!item) {
    throw new EvaluationServiceError("Idea not in shortlist", "NOT_IN_SHORTLIST");
  }

  const targetStatus = FORWARD_TARGET_STATUS_MAP[input.target as ShortlistForwardTarget];

  // Use state machine transition instead of direct status update
  await transitionIdea({ id: input.ideaId, targetStatus }, actor);

  await prisma.evaluationShortlistItem.update({
    where: { id: item.id },
    data: {
      forwardedTo: input.target as ShortlistForwardTarget,
      forwardedAt: new Date(),
    },
  });

  eventBus.emit("evaluation.shortlistForwarded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: session.campaignId,
      ideaId: input.ideaId,
      target: input.target,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId, target: input.target },
    "Shortlist idea forwarded",
  );

  return { forwarded: true, target: input.target };
}

export async function forwardAllShortlistItems(input: ShortlistForwardAllInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, shortlistLocked: true, campaignId: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  if (!session.shortlistLocked) {
    throw new EvaluationServiceError(
      "Shortlist must be locked before forwarding",
      "SHORTLIST_NOT_LOCKED",
    );
  }

  const items = await prisma.evaluationShortlistItem.findMany({
    where: {
      sessionId: input.sessionId,
      forwardedTo: null,
    },
    select: { id: true, ideaId: true },
  });

  if (items.length === 0) {
    return { forwarded: 0 };
  }

  const targetStatus = FORWARD_TARGET_STATUS_MAP[input.target as ShortlistForwardTarget];

  // Use state machine transitions instead of direct status updates
  for (const item of items) {
    await transitionIdea({ id: item.ideaId, targetStatus }, actor);
  }

  await prisma.evaluationShortlistItem.updateMany({
    where: {
      sessionId: input.sessionId,
      forwardedTo: null,
    },
    data: {
      forwardedTo: input.target as ShortlistForwardTarget,
      forwardedAt: new Date(),
    },
  });

  eventBus.emit("evaluation.shortlistForwarded", {
    entity: "evaluationSession",
    entityId: input.sessionId,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: session.campaignId,
      ideaIds: items.map((i) => i.ideaId),
      target: input.target,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, count: items.length, target: input.target },
    "All shortlist items forwarded",
  );

  return { forwarded: items.length };
}
