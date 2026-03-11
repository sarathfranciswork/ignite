import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  NotificationServiceError,
} from "./notification.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const notificationFindMany = prisma.notification.findMany as unknown as Mock;
const notificationFindUnique = prisma.notification.findUnique as unknown as Mock;
const notificationCount = prisma.notification.count as unknown as Mock;
const notificationCreate = prisma.notification.create as unknown as Mock;
const notificationUpdate = prisma.notification.update as unknown as Mock;
const notificationUpdateMany = prisma.notification.updateMany as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const userId = "user-1";

const mockNotification = {
  id: "notif-1",
  userId,
  type: "IDEA_SUBMITTED",
  title: "New idea submitted",
  body: "An idea was submitted",
  entityType: "idea",
  entityId: "idea-1",
  isRead: false,
  createdAt: new Date("2026-03-10T10:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listNotifications", () => {
  it("returns paginated notifications for a user", async () => {
    notificationFindMany.mockResolvedValue([mockNotification]);

    const result = await listNotifications(userId, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("notif-1");
    expect(result.items[0]?.type).toBe("IDEA_SUBMITTED");
    expect(result.nextCursor).toBeUndefined();
    expect(notificationFindMany).toHaveBeenCalledWith({
      where: { userId },
      take: 21,
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns nextCursor when more results exist", async () => {
    const notifications = Array.from({ length: 21 }, (_, i) => ({
      ...mockNotification,
      id: `notif-${i}`,
    }));

    notificationFindMany.mockResolvedValue(notifications);

    const result = await listNotifications(userId, { limit: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("notif-20");
  });

  it("filters by type", async () => {
    notificationFindMany.mockResolvedValue([]);

    await listNotifications(userId, { limit: 20, type: "MENTION" });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, type: "MENTION" },
      }),
    );
  });

  it("filters by unread only", async () => {
    notificationFindMany.mockResolvedValue([]);

    await listNotifications(userId, { limit: 20, unreadOnly: true });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId, isRead: false },
      }),
    );
  });

  it("uses cursor for pagination", async () => {
    notificationFindMany.mockResolvedValue([]);

    await listNotifications(userId, { limit: 20, cursor: "notif-5" });

    expect(notificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "notif-5" },
        skip: 1,
      }),
    );
  });
});

describe("getUnreadCount", () => {
  it("returns the count of unread notifications", async () => {
    notificationCount.mockResolvedValue(5);

    const result = await getUnreadCount(userId);

    expect(result).toBe(5);
    expect(notificationCount).toHaveBeenCalledWith({
      where: { userId, isRead: false },
    });
  });
});

describe("markAsRead", () => {
  it("marks a notification as read", async () => {
    notificationFindUnique.mockResolvedValue(mockNotification);
    notificationUpdate.mockResolvedValue({ ...mockNotification, isRead: true });

    const result = await markAsRead(userId, { id: "notif-1" });

    expect(result.isRead).toBe(true);
    expect(notificationUpdate).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { isRead: true },
    });
  });

  it("throws NOTIFICATION_NOT_FOUND when notification does not exist", async () => {
    notificationFindUnique.mockResolvedValue(null);

    await expect(markAsRead(userId, { id: "notif-missing" })).rejects.toThrow(
      NotificationServiceError,
    );
    await expect(markAsRead(userId, { id: "notif-missing" })).rejects.toThrow(
      "Notification not found",
    );
  });

  it("throws NOT_AUTHORIZED when notification belongs to another user", async () => {
    notificationFindUnique.mockResolvedValue({
      ...mockNotification,
      userId: "other-user",
    });

    await expect(markAsRead(userId, { id: "notif-1" })).rejects.toThrow(NotificationServiceError);
    await expect(markAsRead(userId, { id: "notif-1" })).rejects.toThrow("Not authorized");
  });
});

describe("markAllAsRead", () => {
  it("marks all unread notifications as read", async () => {
    notificationUpdateMany.mockResolvedValue({ count: 3 });

    const result = await markAllAsRead(userId);

    expect(result.count).toBe(3);
    expect(notificationUpdateMany).toHaveBeenCalledWith({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  });
});

describe("createNotification", () => {
  it("creates a notification and emits an event", async () => {
    const input = {
      userId,
      type: "IDEA_SUBMITTED" as const,
      title: "New idea submitted",
      body: "An idea was submitted",
      entityType: "idea",
      entityId: "idea-1",
    };

    notificationCreate.mockResolvedValue({
      ...mockNotification,
      id: "notif-new",
    });

    const result = await createNotification(input);

    expect(result.id).toBe("notif-new");
    expect(notificationCreate).toHaveBeenCalledWith({
      data: {
        userId,
        type: "IDEA_SUBMITTED",
        title: "New idea submitted",
        body: "An idea was submitted",
        entityType: "idea",
        entityId: "idea-1",
      },
    });
    expect(mockEmit).toHaveBeenCalledWith(
      "notification.created",
      expect.objectContaining({
        entity: "notification",
        entityId: "notif-new",
      }),
    );
  });
});
