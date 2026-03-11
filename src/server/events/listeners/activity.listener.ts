import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { prisma } from "@/server/lib/prisma";
import type { Prisma } from "@prisma/client";

const childLogger = logger.child({ service: "activity-listener" });

const globalForListeners = globalThis as unknown as {
  activityListenersRegistered: boolean | undefined;
};

interface ActivityRecord {
  ideaId: string;
  campaignId: string;
  actorId: string;
  eventType: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

async function recordActivity(record: ActivityRecord) {
  try {
    await prisma.activityEvent.create({
      data: {
        ideaId: record.ideaId,
        campaignId: record.campaignId,
        actorId: record.actorId,
        eventType: record.eventType,
        title: record.title,
        body: record.body,
        metadata: (record.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (error) {
    childLogger.error({ error, record }, "Failed to record activity event");
  }
}

async function getIdeaCampaignId(ideaId: string): Promise<string | null> {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { campaignId: true },
  });
  return idea?.campaignId ?? null;
}

/**
 * Register activity stream listeners.
 * Captures all significant idea events into the ActivityEvent table
 * for chronological display in the activity feed.
 */
export function registerActivityListeners() {
  if (globalForListeners.activityListenersRegistered) return;
  globalForListeners.activityListenersRegistered = true;

  eventBus.on("idea.submitted", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.submitted",
      title: "Idea submitted",
      body: `Idea "${payload.metadata?.title as string}" was submitted`,
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.transitioned", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    const newStatus = payload.metadata?.newStatus as string;
    const previousStatus = payload.metadata?.previousStatus as string;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.transitioned",
      title: "Status changed",
      body: `Status changed from ${previousStatus} to ${newStatus}`,
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.statusChanged", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    const newStatus = payload.metadata?.newStatus as string;
    const reason = payload.metadata?.reason as string | undefined;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.statusChanged",
      title: newStatus === "HOT" ? "Graduated to HOT!" : "Status changed",
      body:
        reason === "community_graduation"
          ? "Idea met all community graduation thresholds and was promoted to HOT!"
          : `Status changed to ${newStatus}`,
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.archived", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.archived",
      title: "Idea archived",
      body: payload.metadata?.reason
        ? `Archived: ${payload.metadata.reason as string}`
        : "Idea was archived",
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.unarchived", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.unarchived",
      title: "Idea restored",
      body: `Idea restored to ${payload.metadata?.restoredStatus as string}`,
      metadata: payload.metadata,
    });
  });

  eventBus.on("comment.created", async (payload) => {
    const ideaId = payload.metadata?.ideaId as string | undefined;
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!ideaId || !campaignId) return;

    const isReply = payload.metadata?.isReply as boolean | undefined;

    void recordActivity({
      ideaId,
      campaignId,
      actorId: payload.actor,
      eventType: "comment.created",
      title: isReply ? "Reply added" : "Comment added",
      body: isReply ? "A reply was added to the discussion" : "A new comment was added",
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.liked", async (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) {
      const resolved = await getIdeaCampaignId(payload.entityId);
      if (!resolved) return;
      void recordActivity({
        ideaId: payload.entityId,
        campaignId: resolved,
        actorId: payload.actor,
        eventType: "idea.liked",
        title: "Idea liked",
      });
      return;
    }

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.liked",
      title: "Idea liked",
    });
  });

  eventBus.on("idea.voted", async (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) {
      const resolved = await getIdeaCampaignId(payload.entityId);
      if (!resolved) return;
      void recordActivity({
        ideaId: payload.entityId,
        campaignId: resolved,
        actorId: payload.actor,
        eventType: "idea.voted",
        title: "Vote cast",
        metadata: payload.metadata,
      });
      return;
    }

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.voted",
      title: "Vote cast",
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.followed", async (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) {
      const resolved = await getIdeaCampaignId(payload.entityId);
      if (!resolved) return;
      void recordActivity({
        ideaId: payload.entityId,
        campaignId: resolved,
        actorId: payload.actor,
        eventType: "idea.followed",
        title: "Started following",
      });
      return;
    }

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.followed",
      title: "Started following",
    });
  });

  eventBus.on("idea.coachQualified", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.coachQualified",
      title: "Approved by coach",
      body: "Idea was approved by an idea coach",
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.coachRejected", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.coachRejected",
      title: "Rejected by coach",
      body: "Idea was rejected by an idea coach",
      metadata: payload.metadata,
    });
  });

  eventBus.on("idea.coachRequestedChanges", (payload) => {
    const campaignId = payload.metadata?.campaignId as string | undefined;
    if (!campaignId) return;

    void recordActivity({
      ideaId: payload.entityId,
      campaignId,
      actorId: payload.actor,
      eventType: "idea.coachRequestedChanges",
      title: "Changes requested",
      body: "An idea coach requested changes",
      metadata: payload.metadata,
    });
  });

  childLogger.info("Activity listeners registered");
}
