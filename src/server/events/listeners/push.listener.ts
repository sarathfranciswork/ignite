import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { sendPushNotification } from "@/server/services/push.service";
import { prisma } from "@/server/lib/prisma";

const childLogger = logger.child({ service: "push-listener" });

const globalForListeners = globalThis as unknown as {
  pushListenersRegistered: boolean | undefined;
};

export function registerPushListeners() {
  if (globalForListeners.pushListenersRegistered) return;
  globalForListeners.pushListenersRegistered = true;

  eventBus.on("notification.created", async (payload) => {
    const userId = payload.metadata?.userId as string | undefined;
    if (!userId) return;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationFrequency: true },
      });

      if (!user || user.notificationFrequency !== "IMMEDIATE") return;

      const notification = await prisma.notification.findUnique({
        where: { id: payload.entityId },
        select: {
          title: true,
          body: true,
          type: true,
          entityType: true,
          entityId: true,
        },
      });

      if (!notification) return;

      const url = buildNotificationUrl(notification.entityType, notification.entityId);

      await sendPushNotification({
        userId,
        title: notification.title,
        body: notification.body,
        url,
        tag: `${notification.type}-${notification.entityId}`,
        entityType: notification.entityType,
        entityId: notification.entityId,
      });
    } catch (error) {
      childLogger.warn(
        { error: error instanceof Error ? error.message : "Unknown", userId },
        "Failed to send push notification",
      );
    }
  });

  childLogger.info("Push notification listeners registered");
}

function buildNotificationUrl(entityType: string, entityId: string): string {
  switch (entityType) {
    case "idea":
      return `/ideas/${entityId}`;
    case "campaign":
      return `/campaigns/${entityId}`;
    case "comment":
      return `/ideas/${entityId}`;
    default:
      return "/";
  }
}
