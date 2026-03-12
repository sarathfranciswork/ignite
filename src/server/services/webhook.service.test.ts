import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createWebhook,
  getWebhook,
  listWebhooks,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  listWebhookDeliveries,
  getAvailableEventNames,
  WebhookServiceError,
} from "./webhook.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    webhook: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    webhookDelivery: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const webhookCreate = prisma.webhook.create as unknown as Mock;
const webhookFindUnique = prisma.webhook.findUnique as unknown as Mock;
const webhookFindMany = prisma.webhook.findMany as unknown as Mock;
const webhookUpdate = prisma.webhook.update as unknown as Mock;
const webhookDelete = prisma.webhook.delete as unknown as Mock;
const deliveryFindMany = prisma.webhookDelivery.findMany as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockWebhook = {
  id: "clx123",
  name: "Test Webhook",
  url: "https://example.com/webhook",
  secret: "whsec_abc123",
  status: "ACTIVE",
  events: ["idea.created", "campaign.created"],
  description: "Test webhook",
  createdById: "user1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: { id: "user1", name: "Test User", email: "test@example.com" },
};

describe("webhook.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createWebhook", () => {
    it("creates a webhook and emits event", async () => {
      webhookCreate.mockResolvedValue(mockWebhook);

      const result = await createWebhook(
        {
          name: "Test Webhook",
          url: "https://example.com/webhook",
          events: ["idea.created"],
          description: "Test",
        },
        "user1",
      );

      expect(webhookCreate).toHaveBeenCalledOnce();
      expect(result.id).toBe("clx123");
      expect(result.name).toBe("Test Webhook");
      expect(result.url).toBe("https://example.com/webhook");
      expect(mockEmit).toHaveBeenCalledWith(
        "webhook.created",
        expect.objectContaining({
          entity: "webhook",
          entityId: "clx123",
          actor: "user1",
        }),
      );
    });
  });

  describe("getWebhook", () => {
    it("returns webhook when found", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);

      const result = await getWebhook({ id: "clx123" });
      expect(result.id).toBe("clx123");
      expect(result.name).toBe("Test Webhook");
    });

    it("throws when webhook not found", async () => {
      webhookFindUnique.mockResolvedValue(null);

      await expect(getWebhook({ id: "clx999" })).rejects.toThrow(WebhookServiceError);
      await expect(getWebhook({ id: "clx999" })).rejects.toThrow("Webhook not found");
    });
  });

  describe("listWebhooks", () => {
    it("returns paginated list", async () => {
      webhookFindMany.mockResolvedValue([mockWebhook]);

      const result = await listWebhooks({ limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("clx123");
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockWebhook,
        id: `clx${i}`,
      }));
      webhookFindMany.mockResolvedValue(items);

      const result = await listWebhooks({ limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("clx2");
    });

    it("filters by status", async () => {
      webhookFindMany.mockResolvedValue([]);

      await listWebhooks({ limit: 20, status: "PAUSED" });
      expect(webhookFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PAUSED" },
        }),
      );
    });
  });

  describe("updateWebhook", () => {
    it("updates webhook and emits event", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);
      webhookUpdate.mockResolvedValue({ ...mockWebhook, name: "Updated" });

      const result = await updateWebhook({ id: "clx123", name: "Updated" }, "user1");
      expect(result.name).toBe("Updated");
      expect(mockEmit).toHaveBeenCalledWith(
        "webhook.updated",
        expect.objectContaining({
          entity: "webhook",
          entityId: "clx123",
        }),
      );
    });

    it("throws when webhook not found", async () => {
      webhookFindUnique.mockResolvedValue(null);

      await expect(updateWebhook({ id: "clx999" }, "user1")).rejects.toThrow(WebhookServiceError);
    });

    it("emits webhook.paused when status set to PAUSED", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);
      webhookUpdate.mockResolvedValue({ ...mockWebhook, status: "PAUSED" });

      await updateWebhook({ id: "clx123", status: "PAUSED" }, "user1");
      expect(mockEmit).toHaveBeenCalledWith(
        "webhook.paused",
        expect.objectContaining({
          entity: "webhook",
        }),
      );
    });
  });

  describe("deleteWebhook", () => {
    it("deletes webhook and emits event", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);
      webhookDelete.mockResolvedValue(mockWebhook);

      const result = await deleteWebhook({ id: "clx123" }, "user1");
      expect(result.id).toBe("clx123");
      expect(webhookDelete).toHaveBeenCalledWith({ where: { id: "clx123" } });
      expect(mockEmit).toHaveBeenCalledWith(
        "webhook.deleted",
        expect.objectContaining({
          entity: "webhook",
          entityId: "clx123",
        }),
      );
    });

    it("throws when webhook not found", async () => {
      webhookFindUnique.mockResolvedValue(null);

      await expect(deleteWebhook({ id: "clx999" }, "user1")).rejects.toThrow(WebhookServiceError);
    });
  });

  describe("regenerateWebhookSecret", () => {
    it("generates a new secret", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);
      webhookUpdate.mockResolvedValue(mockWebhook);

      const result = await regenerateWebhookSecret({ id: "clx123" }, "user1");
      expect(result.id).toBe("clx123");
      expect(result.secret).toMatch(/^whsec_/);
    });

    it("throws when webhook not found", async () => {
      webhookFindUnique.mockResolvedValue(null);

      await expect(regenerateWebhookSecret({ id: "clx999" }, "user1")).rejects.toThrow(
        WebhookServiceError,
      );
    });
  });

  describe("listWebhookDeliveries", () => {
    it("returns paginated delivery list", async () => {
      const mockDelivery = {
        id: "del1",
        webhookId: "clx123",
        eventName: "idea.created",
        status: "SUCCESS",
        httpStatusCode: 200,
        errorMessage: null,
        attemptCount: 1,
        deliveredAt: new Date("2026-01-01"),
        createdAt: new Date("2026-01-01"),
      };
      deliveryFindMany.mockResolvedValue([mockDelivery]);

      const result = await listWebhookDeliveries({ webhookId: "clx123", limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.status).toBe("SUCCESS");
    });
  });

  describe("getAvailableEventNames", () => {
    it("returns a list of event names", () => {
      const events = getAvailableEventNames();
      expect(events.length).toBeGreaterThan(0);
      expect(events).toContain("idea.created");
      expect(events).toContain("campaign.created");
    });
  });
});
