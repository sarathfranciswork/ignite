import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  PushSubscriptionSubscribeInput,
  PushSubscriptionUnsubscribeInput,
  PushNotificationSendInput,
} from "./push.schemas";

export {
  pushSubscriptionSubscribeInput,
  pushSubscriptionUnsubscribeInput,
  pushNotificationSendInput,
} from "./push.schemas";

export type {
  PushSubscriptionSubscribeInput,
  PushSubscriptionUnsubscribeInput,
  PushNotificationSendInput,
} from "./push.schemas";

const childLogger = logger.child({ service: "push" });

export class PushServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PushServiceError";
  }
}

function serializeSubscription(sub: {
  id: string;
  userId: string;
  endpoint: string;
  userAgent: string | null;
  createdAt: Date;
}) {
  return {
    id: sub.id,
    userId: sub.userId,
    endpoint: sub.endpoint,
    userAgent: sub.userAgent,
    createdAt: sub.createdAt.toISOString(),
  };
}

export async function subscribe(userId: string, input: PushSubscriptionSubscribeInput) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
  });

  if (existing) {
    if (existing.userId === userId) {
      const updated = await prisma.pushSubscription.update({
        where: { endpoint: input.endpoint },
        data: {
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
          userAgent: input.userAgent ?? null,
        },
      });
      childLogger.info({ userId, subscriptionId: updated.id }, "Push subscription updated");
      return serializeSubscription(updated);
    }

    await prisma.pushSubscription.delete({
      where: { endpoint: input.endpoint },
    });
  }

  const subscription = await prisma.pushSubscription.create({
    data: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent ?? null,
    },
  });

  childLogger.info({ userId, subscriptionId: subscription.id }, "Push subscription created");

  eventBus.emit("push.subscribed", {
    entity: "pushSubscription",
    entityId: subscription.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return serializeSubscription(subscription);
}

export async function unsubscribe(userId: string, input: PushSubscriptionUnsubscribeInput) {
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: input.endpoint },
  });

  if (!existing) {
    throw new PushServiceError("SUBSCRIPTION_NOT_FOUND", "Push subscription not found");
  }

  if (existing.userId !== userId) {
    throw new PushServiceError("NOT_AUTHORIZED", "Not authorized to remove this subscription");
  }

  await prisma.pushSubscription.delete({
    where: { endpoint: input.endpoint },
  });

  childLogger.info({ userId, endpoint: input.endpoint }, "Push subscription removed");

  eventBus.emit("push.unsubscribed", {
    entity: "pushSubscription",
    entityId: existing.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

export async function listSubscriptions(userId: string) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return subscriptions.map(serializeSubscription);
}

export async function getVapidPublicKey(): Promise<string | null> {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export async function sendPushNotification(input: PushNotificationSendInput) {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    childLogger.debug("Push notifications not configured — VAPID keys missing");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: input.userId },
  });

  if (subscriptions.length === 0) {
    childLogger.debug({ userId: input.userId }, "No push subscriptions found for user");
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url,
    tag: input.tag,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      const { default: webpush } = await import("web-push");
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
        { TTL: 60 * 60 },
      );
      sent++;
    } catch (error: unknown) {
      failed++;
      const statusCode =
        error instanceof Error && "statusCode" in error
          ? (error as Error & { statusCode: number }).statusCode
          : undefined;

      if (statusCode === 410 || statusCode === 404) {
        staleEndpoints.push(sub.endpoint);
      } else {
        childLogger.warn(
          { endpoint: sub.endpoint, error: error instanceof Error ? error.message : "Unknown" },
          "Push notification delivery failed",
        );
      }
    }
  }

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
    childLogger.info(
      { userId: input.userId, count: staleEndpoints.length },
      "Cleaned up stale push subscriptions",
    );
  }

  childLogger.info({ userId: input.userId, sent, failed }, "Push notification batch completed");

  return { sent, failed };
}
