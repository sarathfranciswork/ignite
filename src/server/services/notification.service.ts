import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  NotificationListInput,
  NotificationMarkReadInput,
  NotificationCreateInput,
} from "./notification.schemas";

export {
  notificationListInput,
  notificationMarkReadInput,
  notificationCreateInput,
} from "./notification.schemas";

export type {
  NotificationListInput,
  NotificationMarkReadInput,
  NotificationCreateInput,
} from "./notification.schemas";

const childLogger = logger.child({ service: "notification" });

export class NotificationServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "NotificationServiceError";
  }
}

function serializeNotification(notification: {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function listNotifications(userId: string, input: NotificationListInput) {
  const { cursor, limit, type, unreadOnly } = input;

  const where: Record<string, unknown> = { userId };
  if (type) {
    where.type = type;
  }
  if (unreadOnly) {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (notifications.length > limit) {
    const last = notifications.pop();
    nextCursor = last?.id;
  }

  return {
    items: notifications.map(serializeNotification),
    nextCursor,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(userId: string, input: NotificationMarkReadInput) {
  const notification = await prisma.notification.findUnique({
    where: { id: input.id },
  });

  if (!notification) {
    throw new NotificationServiceError("NOTIFICATION_NOT_FOUND", "Notification not found");
  }

  if (notification.userId !== userId) {
    throw new NotificationServiceError("NOT_AUTHORIZED", "Not authorized to modify this notification");
  }

  const updated = await prisma.notification.update({
    where: { id: input.id },
    data: { isRead: true },
  });

  return serializeNotification(updated);
}

export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  childLogger.info({ userId, count: result.count }, "Marked all notifications as read");

  return { count: result.count };
}

export async function createNotification(input: NotificationCreateInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  childLogger.info(
    { notificationId: notification.id, userId: input.userId, type: input.type },
    "Notification created",
  );

  eventBus.emit("notification.created", {
    entity: "notification",
    entityId: notification.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: { userId: input.userId, type: input.type },
  });

  return serializeNotification(notification);
}
