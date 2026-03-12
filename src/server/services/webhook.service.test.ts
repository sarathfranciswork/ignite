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
  isPrivateIP,
  validateWebhookUrl,
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

vi.mock("dns/promises", () => {
  const resolve4 = vi.fn().mockResolvedValue(["93.184.216.34"]);
  const resolve6 = vi.fn().mockResolvedValue([]);
  return {
    default: { resolve4, resolve6 },
    resolve4,
    resolve6,
  };
});

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const dns = await import("dns/promises");

const mockResolve4 = dns.resolve4 as unknown as Mock;
const mockResolve6 = dns.resolve6 as unknown as Mock;

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

  describe("isPrivateIP", () => {
    it("detects 127.x.x.x (loopback)", () => {
      expect(isPrivateIP("127.0.0.1")).toBe(true);
      expect(isPrivateIP("127.255.255.255")).toBe(true);
    });

    it("detects 10.x.x.x (private)", () => {
      expect(isPrivateIP("10.0.0.1")).toBe(true);
      expect(isPrivateIP("10.255.255.255")).toBe(true);
    });

    it("detects 172.16-31.x.x (private)", () => {
      expect(isPrivateIP("172.16.0.1")).toBe(true);
      expect(isPrivateIP("172.31.255.255")).toBe(true);
      expect(isPrivateIP("172.15.0.1")).toBe(false);
      expect(isPrivateIP("172.32.0.1")).toBe(false);
    });

    it("detects 192.168.x.x (private)", () => {
      expect(isPrivateIP("192.168.0.1")).toBe(true);
      expect(isPrivateIP("192.168.255.255")).toBe(true);
    });

    it("detects 169.254.x.x (link-local / cloud metadata)", () => {
      expect(isPrivateIP("169.254.169.254")).toBe(true);
      expect(isPrivateIP("169.254.0.1")).toBe(true);
    });

    it("detects 0.x.x.x", () => {
      expect(isPrivateIP("0.0.0.0")).toBe(true);
      expect(isPrivateIP("0.1.2.3")).toBe(true);
    });

    it("allows public IPv4 addresses", () => {
      expect(isPrivateIP("8.8.8.8")).toBe(false);
      expect(isPrivateIP("1.1.1.1")).toBe(false);
      expect(isPrivateIP("203.0.113.1")).toBe(false);
    });

    it("detects IPv6 loopback (::1) and unspecified (::)", () => {
      expect(isPrivateIP("::1")).toBe(true);
      expect(isPrivateIP("::")).toBe(true);
    });

    it("detects IPv6 link-local (fe80:)", () => {
      expect(isPrivateIP("fe80::1")).toBe(true);
    });

    it("detects IPv6 ULA (fc/fd)", () => {
      expect(isPrivateIP("fc00::1")).toBe(true);
      expect(isPrivateIP("fd12:3456::1")).toBe(true);
    });

    it("detects IPv4-mapped IPv6 addresses with private IPs", () => {
      expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
      expect(isPrivateIP("::ffff:192.168.1.1")).toBe(true);
    });

    it("allows IPv4-mapped IPv6 addresses with public IPs", () => {
      expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);
    });
  });

  describe("validateWebhookUrl", () => {
    it("rejects non-http(s) protocols", async () => {
      await expect(validateWebhookUrl("ftp://example.com")).rejects.toThrow(
        "Webhook URL must use http or https",
      );
    });

    it("rejects localhost", async () => {
      await expect(validateWebhookUrl("https://localhost/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
    });

    it("rejects .local hostnames", async () => {
      await expect(validateWebhookUrl("https://myhost.local/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
    });

    it("rejects private IP literals", async () => {
      await expect(validateWebhookUrl("https://127.0.0.1/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
      await expect(validateWebhookUrl("https://10.0.0.1/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
      await expect(validateWebhookUrl("https://192.168.1.1/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
    });

    it("allows public IP literals", async () => {
      await expect(validateWebhookUrl("https://93.184.216.34/hook")).resolves.toBeUndefined();
    });

    it("rejects when DNS resolves to private IP", async () => {
      mockResolve4.mockResolvedValue(["10.0.0.1"]);
      mockResolve6.mockResolvedValue([]);

      await expect(validateWebhookUrl("https://evil.example.com/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
    });

    it("rejects when DNS resolves to private IPv6", async () => {
      mockResolve4.mockResolvedValue([]);
      mockResolve6.mockResolvedValue(["::1"]);

      await expect(validateWebhookUrl("https://evil.example.com/hook")).rejects.toThrow(
        "Webhook URL must not target private/internal networks",
      );
    });

    it("rejects when hostname cannot be resolved", async () => {
      mockResolve4.mockRejectedValue(new Error("ENOTFOUND"));
      mockResolve6.mockRejectedValue(new Error("ENOTFOUND"));

      await expect(validateWebhookUrl("https://nonexistent.example.com/hook")).rejects.toThrow(
        "Could not resolve webhook URL hostname",
      );
    });

    it("allows valid public URLs", async () => {
      mockResolve4.mockResolvedValue(["93.184.216.34"]);
      mockResolve6.mockResolvedValue([]);

      await expect(validateWebhookUrl("https://example.com/webhook")).resolves.toBeUndefined();
    });
  });

  describe("createWebhook with URL validation", () => {
    it("rejects webhook creation with private URL", async () => {
      await expect(
        createWebhook(
          {
            name: "Bad Webhook",
            url: "https://localhost/hook",
            events: ["idea.created"],
          },
          "user1",
        ),
      ).rejects.toThrow("Webhook URL must not target private/internal networks");

      expect(webhookCreate).not.toHaveBeenCalled();
    });
  });

  describe("updateWebhook with URL validation", () => {
    it("rejects webhook update with private URL", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);

      await expect(
        updateWebhook({ id: "clx123", url: "https://127.0.0.1/hook" }, "user1"),
      ).rejects.toThrow("Webhook URL must not target private/internal networks");

      expect(webhookUpdate).not.toHaveBeenCalled();
    });

    it("allows update without URL change", async () => {
      webhookFindUnique.mockResolvedValue(mockWebhook);
      webhookUpdate.mockResolvedValue({ ...mockWebhook, name: "Renamed" });

      const result = await updateWebhook({ id: "clx123", name: "Renamed" }, "user1");
      expect(result.name).toBe("Renamed");
    });
  });
});
