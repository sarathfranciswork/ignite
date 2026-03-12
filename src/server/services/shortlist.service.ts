import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import {
  EvaluationServiceError,
  type ShortlistGetInput,
  type ShortlistAddIdeasInput,
  type ShortlistRemoveIdeaInput,
  type ShortlistLockInput,
  type ShortlistForwardInput,
  type ShortlistUpdateEntryInput,
} from "./evaluation.schemas";

const childLogger = logger.child({ service: "shortlist" });

// ── Get Shortlist for Session ────────────────────────────────

export async function getShortlist(input: ShortlistGetInput) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, status: true, campaignId: true, title: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  const shortlist = await prisma.shortlist.findUnique({
    where: { sessionId: input.sessionId },
    include: {
      entries: {
        include: {
          idea: {
            select: { id: true, title: true, teaser: true, status: true },
          },
        },
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!shortlist) {
    return {
      sessionId: input.sessionId,
      isLocked: false,
      entries: [],
      exists: false,
    };
  }

  return {
    sessionId: input.sessionId,
    isLocked: shortlist.isLocked,
    lockedAt: shortlist.lockedAt?.toISOString() ?? null,
    entries: shortlist.entries.map((e) => ({
      ideaId: e.ideaId,
      ideaTitle: e.idea.title,
      ideaTeaser: e.idea.teaser,
      ideaStatus: e.idea.status,
      rank: e.rank,
      notes: e.notes,
      forwardedTo: e.forwardedTo,
      forwardedAt: e.forwardedAt?.toISOString() ?? null,
    })),
    exists: true,
  };
}

// ── Add Ideas to Shortlist ──────────────────────────────────

export async function addIdeasToShortlist(input: ShortlistAddIdeasInput, actor: string) {
  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, campaignId: true, title: true },
  });

  if (!session) {
    throw new EvaluationServiceError("Evaluation session not found", "SESSION_NOT_FOUND");
  }

  // Verify all ideas exist in session
  const sessionIdeas = await prisma.evaluationSessionIdea.findMany({
    where: { sessionId: input.sessionId, ideaId: { in: input.ideaIds } },
    select: { ideaId: true },
  });

  const validIdeaIds = new Set(sessionIdeas.map((si) => si.ideaId));
  const invalidIds = input.ideaIds.filter((id) => !validIdeaIds.has(id));

  if (invalidIds.length > 0) {
    throw new EvaluationServiceError(
      `Ideas not found in session: ${invalidIds.join(", ")}`,
      "IDEAS_NOT_FOUND",
    );
  }

  // Upsert shortlist
  const shortlist = await prisma.shortlist.upsert({
    where: { sessionId: input.sessionId },
    create: {
      sessionId: input.sessionId,
      createdById: actor,
    },
    update: {},
  });

  // Check if locked
  if (shortlist.isLocked) {
    throw new EvaluationServiceError(
      "Shortlist is locked and cannot be modified",
      "SHORTLIST_LOCKED",
    );
  }

  // Get current max rank
  const maxRank = await prisma.shortlistEntry.aggregate({
    where: { shortlistId: shortlist.id },
    _max: { rank: true },
  });

  let nextRank = (maxRank._max.rank ?? -1) + 1;

  // Add entries (skip duplicates)
  const existing = await prisma.shortlistEntry.findMany({
    where: { shortlistId: shortlist.id, ideaId: { in: input.ideaIds } },
    select: { ideaId: true },
  });

  const existingIds = new Set(existing.map((e) => e.ideaId));
  const newIdeaIds = input.ideaIds.filter((id) => !existingIds.has(id));

  if (newIdeaIds.length > 0) {
    await prisma.shortlistEntry.createMany({
      data: newIdeaIds.map((ideaId) => ({
        shortlistId: shortlist.id,
        ideaId,
        rank: nextRank++,
      })),
    });
  }

  eventBus.emit("evaluation.shortlistUpdated", {
    entity: "shortlist",
    entityId: shortlist.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      sessionId: input.sessionId,
      campaignId: session.campaignId,
      addedIdeaIds: newIdeaIds,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, addedCount: newIdeaIds.length },
    "Ideas added to shortlist",
  );

  return { added: newIdeaIds.length, total: nextRank };
}

// ── Remove Idea from Shortlist ──────────────────────────────

export async function removeIdeaFromShortlist(input: ShortlistRemoveIdeaInput, actor: string) {
  const shortlist = await prisma.shortlist.findUnique({
    where: { sessionId: input.sessionId },
  });

  if (!shortlist) {
    throw new EvaluationServiceError("Shortlist not found", "SHORTLIST_NOT_FOUND");
  }

  if (shortlist.isLocked) {
    throw new EvaluationServiceError(
      "Shortlist is locked and cannot be modified",
      "SHORTLIST_LOCKED",
    );
  }

  const entry = await prisma.shortlistEntry.findUnique({
    where: { shortlistId_ideaId: { shortlistId: shortlist.id, ideaId: input.ideaId } },
  });

  if (!entry) {
    throw new EvaluationServiceError("Idea not found in shortlist", "IDEA_NOT_IN_SHORTLIST");
  }

  await prisma.shortlistEntry.delete({
    where: { id: entry.id },
  });

  eventBus.emit("evaluation.shortlistUpdated", {
    entity: "shortlist",
    entityId: shortlist.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      sessionId: input.sessionId,
      removedIdeaId: input.ideaId,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId },
    "Idea removed from shortlist",
  );

  return { removed: true };
}

// ── Lock Shortlist ──────────────────────────────────────────

export async function lockShortlist(input: ShortlistLockInput, actor: string) {
  const shortlist = await prisma.shortlist.findUnique({
    where: { sessionId: input.sessionId },
    include: { _count: { select: { entries: true } } },
  });

  if (!shortlist) {
    throw new EvaluationServiceError("Shortlist not found", "SHORTLIST_NOT_FOUND");
  }

  if (shortlist.isLocked) {
    throw new EvaluationServiceError("Shortlist is already locked", "SHORTLIST_ALREADY_LOCKED");
  }

  if (shortlist._count.entries === 0) {
    throw new EvaluationServiceError("Cannot lock an empty shortlist", "SHORTLIST_EMPTY");
  }

  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { campaignId: true },
  });

  const updated = await prisma.shortlist.update({
    where: { id: shortlist.id },
    data: {
      isLocked: true,
      lockedById: actor,
      lockedAt: new Date(),
    },
  });

  eventBus.emit("evaluation.shortlistLocked", {
    entity: "shortlist",
    entityId: shortlist.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      sessionId: input.sessionId,
      campaignId: session?.campaignId,
      entryCount: shortlist._count.entries,
    },
  });

  childLogger.info({ sessionId: input.sessionId }, "Shortlist locked");

  return {
    isLocked: updated.isLocked,
    lockedAt: updated.lockedAt?.toISOString() ?? null,
  };
}

// ── Forward Shortlisted Idea ────────────────────────────────

export async function forwardShortlistedIdea(input: ShortlistForwardInput, actor: string) {
  const shortlist = await prisma.shortlist.findUnique({
    where: { sessionId: input.sessionId },
  });

  if (!shortlist) {
    throw new EvaluationServiceError("Shortlist not found", "SHORTLIST_NOT_FOUND");
  }

  const entry = await prisma.shortlistEntry.findUnique({
    where: { shortlistId_ideaId: { shortlistId: shortlist.id, ideaId: input.ideaId } },
  });

  if (!entry) {
    throw new EvaluationServiceError("Idea not found in shortlist", "IDEA_NOT_IN_SHORTLIST");
  }

  const updated = await prisma.shortlistEntry.update({
    where: { id: entry.id },
    data: {
      forwardedTo: input.destination,
      forwardedAt: new Date(),
      forwardedBy: actor,
    },
  });

  const session = await prisma.evaluationSession.findUnique({
    where: { id: input.sessionId },
    select: { campaignId: true },
  });

  eventBus.emit("evaluation.shortlistIdeaForwarded", {
    entity: "shortlistEntry",
    entityId: entry.id,
    actor,
    timestamp: new Date().toISOString(),
    metadata: {
      sessionId: input.sessionId,
      campaignId: session?.campaignId,
      ideaId: input.ideaId,
      destination: input.destination,
    },
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId, destination: input.destination },
    "Shortlisted idea forwarded",
  );

  return {
    ideaId: input.ideaId,
    forwardedTo: updated.forwardedTo,
    forwardedAt: updated.forwardedAt?.toISOString() ?? null,
  };
}

// ── Update Shortlist Entry (rank, notes) ────────────────────

export async function updateShortlistEntry(input: ShortlistUpdateEntryInput, actor: string) {
  const shortlist = await prisma.shortlist.findUnique({
    where: { sessionId: input.sessionId },
  });

  if (!shortlist) {
    throw new EvaluationServiceError("Shortlist not found", "SHORTLIST_NOT_FOUND");
  }

  if (shortlist.isLocked) {
    throw new EvaluationServiceError(
      "Shortlist is locked and cannot be modified",
      "SHORTLIST_LOCKED",
    );
  }

  const entry = await prisma.shortlistEntry.findUnique({
    where: { shortlistId_ideaId: { shortlistId: shortlist.id, ideaId: input.ideaId } },
  });

  if (!entry) {
    throw new EvaluationServiceError("Idea not found in shortlist", "IDEA_NOT_IN_SHORTLIST");
  }

  const updateData: Record<string, unknown> = {};
  if (input.rank !== undefined) updateData.rank = input.rank;
  if (input.notes !== undefined) updateData.notes = input.notes;

  const updated = await prisma.shortlistEntry.update({
    where: { id: entry.id },
    data: updateData,
  });

  childLogger.info(
    { sessionId: input.sessionId, ideaId: input.ideaId, actor },
    "Shortlist entry updated",
  );

  return {
    ideaId: updated.ideaId,
    rank: updated.rank,
    notes: updated.notes,
  };
}
