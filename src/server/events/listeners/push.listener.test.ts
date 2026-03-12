import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      findUnique: vi.fn(),
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

vi.mock("@/server/services/push.service", () => ({
  sendPushNotification: vi.fn(),
}));

vi.mock("@/server/events/event-bus", () => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    eventBus: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
      }),
      emit: vi.fn((event: string, payload: unknown) => {
        if (handlers[event]) {
          for (const handler of handlers[event]) {
            handler(payload);
          }
        }
      }),
    },
  };
});

const { prisma } = await import("@/server/lib/prisma");
const { sendPushNotification } = await import("@/server/services/push.service");
const { eventBus } = await import("@/server/events/event-bus");

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const notificationFindUnique = prisma.notification.findUnique as unknown as Mock;
const sendPush = sendPushNotification as unknown as Mock;

// Reset the global flag so we can re-register
const g = globalThis as unknown as { pushListenersRegistered: boolean | undefined };

beforeEach(() => {
  vi.clearAllMocks();
  g.pushListenersRegistered = undefined;
});

describe("push listener", () => {
  it("sends push notification for IMMEDIATE frequency users", async () => {
    g.pushListenersRegistered = undefined;
    const { registerPushListeners } = await import("./push.listener");
    registerPushListeners();

    userFindUnique.mockResolvedValue({ notificationFrequency: "IMMEDIATE" });
    notificationFindUnique.mockResolvedValue({
      title: "Test notification",
      body: "Test body",
      type: "IDEA_SUBMITTED",
      entityType: "idea",
      entityId: "idea-1",
    });
    sendPush.mockResolvedValue({ sent: 1, failed: 0 });

    eventBus.emit("notification.created", {
      entity: "notification",
      entityId: "notif-1",
      actor: "system",
      timestamp: new Date().toISOString(),
      metadata: { userId: "user-1", type: "IDEA_SUBMITTED" },
    });

    // Wait for async handlers
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendPush).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        title: "Test notification",
        body: "Test body",
        entityType: "idea",
        entityId: "idea-1",
      }),
    );
  });

  it("skips push notification for DAILY frequency users", async () => {
    g.pushListenersRegistered = undefined;
    const { registerPushListeners } = await import("./push.listener");
    registerPushListeners();

    userFindUnique.mockResolvedValue({ notificationFrequency: "DAILY" });

    eventBus.emit("notification.created", {
      entity: "notification",
      entityId: "notif-1",
      actor: "system",
      timestamp: new Date().toISOString(),
      metadata: { userId: "user-1", type: "IDEA_SUBMITTED" },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendPush).not.toHaveBeenCalled();
  });

  it("skips when no userId in metadata", async () => {
    g.pushListenersRegistered = undefined;
    const { registerPushListeners } = await import("./push.listener");
    registerPushListeners();

    eventBus.emit("notification.created", {
      entity: "notification",
      entityId: "notif-1",
      actor: "system",
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendPush).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});
