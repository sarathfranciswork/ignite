import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  subscribe,
  unsubscribe,
  listSubscriptions,
  getVapidPublicKey,
  sendPushNotification,
  PushServiceError,
} from "./push.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    pushSubscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
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

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const subFindUnique = prisma.pushSubscription.findUnique as unknown as Mock;
const subFindMany = prisma.pushSubscription.findMany as unknown as Mock;
const subCreate = prisma.pushSubscription.create as unknown as Mock;
const subUpdate = prisma.pushSubscription.update as unknown as Mock;
const subDelete = prisma.pushSubscription.delete as unknown as Mock;
const eventBusEmit = eventBus.emit as unknown as Mock;

const userId = "user-1";
const endpoint = "https://push.example.com/sub/abc123";
const subscribeInput = {
  endpoint,
  keys: {
    p256dh:
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPU",
    auth: "tBHItJI5svbpC7EtMSxUAw",
  },
  userAgent: "Mozilla/5.0 Test",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscribe", () => {
  it("creates a new subscription when none exists", async () => {
    subFindUnique.mockResolvedValue(null);
    const created = {
      id: "sub-1",
      userId,
      endpoint,
      p256dh: subscribeInput.keys.p256dh,
      auth: subscribeInput.keys.auth,
      userAgent: subscribeInput.userAgent,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    subCreate.mockResolvedValue(created);

    const result = await subscribe(userId, subscribeInput);

    expect(subCreate).toHaveBeenCalledWith({
      data: {
        userId,
        endpoint,
        p256dh: subscribeInput.keys.p256dh,
        auth: subscribeInput.keys.auth,
        userAgent: subscribeInput.userAgent,
      },
    });
    expect(result.id).toBe("sub-1");
    expect(result.endpoint).toBe(endpoint);
    expect(eventBusEmit).toHaveBeenCalledWith(
      "push.subscribed",
      expect.objectContaining({ entityId: "sub-1", actor: userId }),
    );
  });

  it("updates existing subscription for same user", async () => {
    const existing = {
      id: "sub-1",
      userId,
      endpoint,
      p256dh: "old-key",
      auth: "old-auth",
      userAgent: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    subFindUnique.mockResolvedValue(existing);
    subUpdate.mockResolvedValue({
      ...existing,
      p256dh: subscribeInput.keys.p256dh,
      auth: subscribeInput.keys.auth,
      userAgent: subscribeInput.userAgent,
    });

    const result = await subscribe(userId, subscribeInput);

    expect(subUpdate).toHaveBeenCalled();
    expect(subCreate).not.toHaveBeenCalled();
    expect(result.id).toBe("sub-1");
  });

  it("replaces subscription owned by different user", async () => {
    const existing = {
      id: "sub-1",
      userId: "other-user",
      endpoint,
      p256dh: "old-key",
      auth: "old-auth",
      userAgent: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    subFindUnique.mockResolvedValue(existing);
    subDelete.mockResolvedValue(existing);
    const created = {
      id: "sub-2",
      userId,
      endpoint,
      p256dh: subscribeInput.keys.p256dh,
      auth: subscribeInput.keys.auth,
      userAgent: subscribeInput.userAgent,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    subCreate.mockResolvedValue(created);

    const result = await subscribe(userId, subscribeInput);

    expect(subDelete).toHaveBeenCalledWith({ where: { endpoint } });
    expect(subCreate).toHaveBeenCalled();
    expect(result.id).toBe("sub-2");
  });
});

describe("unsubscribe", () => {
  it("removes an existing subscription", async () => {
    const existing = {
      id: "sub-1",
      userId,
      endpoint,
      p256dh: "key",
      auth: "auth",
      userAgent: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    subFindUnique.mockResolvedValue(existing);
    subDelete.mockResolvedValue(existing);

    const result = await unsubscribe(userId, { endpoint });

    expect(subDelete).toHaveBeenCalledWith({ where: { endpoint } });
    expect(result).toEqual({ success: true });
    expect(eventBusEmit).toHaveBeenCalledWith(
      "push.unsubscribed",
      expect.objectContaining({ entityId: "sub-1", actor: userId }),
    );
  });

  it("throws SUBSCRIPTION_NOT_FOUND when subscription does not exist", async () => {
    subFindUnique.mockResolvedValue(null);

    await expect(unsubscribe(userId, { endpoint })).rejects.toThrow(PushServiceError);
    await expect(unsubscribe(userId, { endpoint })).rejects.toThrow("Push subscription not found");
  });

  it("throws NOT_AUTHORIZED when subscription belongs to another user", async () => {
    subFindUnique.mockResolvedValue({
      id: "sub-1",
      userId: "other-user",
      endpoint,
      p256dh: "key",
      auth: "auth",
      userAgent: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });

    await expect(unsubscribe(userId, { endpoint })).rejects.toThrow(PushServiceError);
    await expect(unsubscribe(userId, { endpoint })).rejects.toThrow("Not authorized");
  });
});

describe("listSubscriptions", () => {
  it("returns serialized subscriptions for user", async () => {
    subFindMany.mockResolvedValue([
      {
        id: "sub-1",
        userId,
        endpoint,
        p256dh: "key",
        auth: "auth",
        userAgent: "Chrome",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ]);

    const result = await listSubscriptions(userId);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "sub-1",
      userId,
      endpoint,
      userAgent: "Chrome",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});

describe("getVapidPublicKey", () => {
  it("returns VAPID_PUBLIC_KEY from env", async () => {
    const original = process.env.VAPID_PUBLIC_KEY;
    process.env.VAPID_PUBLIC_KEY = "test-vapid-key";

    const key = await getVapidPublicKey();
    expect(key).toBe("test-vapid-key");

    if (original !== undefined) {
      process.env.VAPID_PUBLIC_KEY = original;
    } else {
      delete process.env.VAPID_PUBLIC_KEY;
    }
  });

  it("returns null when VAPID_PUBLIC_KEY is not set", async () => {
    const original = process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;

    const key = await getVapidPublicKey();
    expect(key).toBeNull();

    if (original !== undefined) {
      process.env.VAPID_PUBLIC_KEY = original;
    }
  });
});

describe("sendPushNotification", () => {
  it("returns zeros when VAPID keys are not configured", async () => {
    const origPub = process.env.VAPID_PUBLIC_KEY;
    const origPriv = process.env.VAPID_PRIVATE_KEY;
    const origSub = process.env.VAPID_SUBJECT;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;

    const result = await sendPushNotification({
      userId,
      title: "Test",
      body: "Test body",
    });

    expect(result).toEqual({ sent: 0, failed: 0 });

    if (origPub) process.env.VAPID_PUBLIC_KEY = origPub;
    if (origPriv) process.env.VAPID_PRIVATE_KEY = origPriv;
    if (origSub) process.env.VAPID_SUBJECT = origSub;
  });

  it("returns zeros when user has no subscriptions", async () => {
    process.env.VAPID_PUBLIC_KEY = "test-pub";
    process.env.VAPID_PRIVATE_KEY = "test-priv";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";

    subFindMany.mockResolvedValue([]);

    const result = await sendPushNotification({
      userId,
      title: "Test",
      body: "Test body",
    });

    expect(result).toEqual({ sent: 0, failed: 0 });

    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });
});
