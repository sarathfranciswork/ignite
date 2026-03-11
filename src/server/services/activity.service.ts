import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type { Prisma } from "@prisma/client";
import type { ActivityListInput, ActivityListByCampaignInput } from "./activity.schemas";

export { activityListInput, activityListByCampaignInput } from "./activity.schemas";
export type { ActivityListInput, ActivityListByCampaignInput } from "./activity.schemas";

const childLogger = logger.child({ service: "activity" });

export class ActivityServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ActivityServiceError";
  }
}

interface CreateActivityInput {
  ideaId: string;
  campaignId: string;
  actorId: string;
  eventType: string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

function serializeActivityEvent(event: {
  id: string;
  ideaId: string;
  campaignId: string;
  actorId: string;
  eventType: string;
  title: string;
  body: string | null;
  metadata: unknown;
  createdAt: Date;
  actor?: { id: string; name: string | null; email: string; image: string | null };
}) {
  return {
    id: event.id,
    ideaId: event.ideaId,
    campaignId: event.campaignId,
    actorId: event.actorId,
    eventType: event.eventType,
    title: event.title,
    body: event.body,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
    actor: event.actor,
  };
}

/**
 * Create an activity event for an idea.
 */
export async function createActivityEvent(input: CreateActivityInput) {
  try {
    const event = await prisma.activityEvent.create({
      data: {
        ideaId: input.ideaId,
        campaignId: input.campaignId,
        actorId: input.actorId,
        eventType: input.eventType,
        title: input.title,
        body: input.body,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    childLogger.info(
      { activityId: event.id, ideaId: input.ideaId, eventType: input.eventType },
      "Activity event created",
    );

    return event;
  } catch (error) {
    childLogger.error({ error, input }, "Failed to create activity event");
    throw error;
  }
}

/**
 * List activity events for an idea with cursor-based pagination.
 */
export async function listActivityByIdea(input: ActivityListInput) {
  const items = await prisma.activityEvent.findMany({
    where: { ideaId: input.ideaId },
    include: {
      actor: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(serializeActivityEvent),
    nextCursor,
  };
}

/**
 * List activity events for a campaign with cursor-based pagination.
 */
export async function listActivityByCampaign(input: ActivityListByCampaignInput) {
  const items = await prisma.activityEvent.findMany({
    where: { campaignId: input.campaignId },
    include: {
      actor: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(serializeActivityEvent),
    nextCursor,
  };
}
