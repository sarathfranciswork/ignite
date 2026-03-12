import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createApiKey,
  getApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  validateApiKey,
  hashApiKey,
  getAvailableScopes,
  ApiKeyServiceError,
} from "./api-key.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    apiKey: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

const apiKeyCreate = prisma.apiKey.create as unknown as Mock;
const apiKeyFindUnique = prisma.apiKey.findUnique as unknown as Mock;
const apiKeyFindMany = prisma.apiKey.findMany as unknown as Mock;
const apiKeyUpdate = prisma.apiKey.update as unknown as Mock;
const apiKeyDelete = prisma.apiKey.delete as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockApiKey = {
  id: "clx456",
  name: "Test Key",
  keyPrefix: "ign_abc12345",
  keyHash: "hash123",
  scopes: ["campaigns:read"],
  isActive: true,
  expiresAt: null,
  lastUsedAt: null,
  createdById: "user1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: { id: "user1", name: "Test User", email: "test@example.com" },
};

describe("api-key.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createApiKey", () => {
    it("creates an API key with raw key returned", async () => {
      apiKeyCreate.mockResolvedValue(mockApiKey);

      const result = await createApiKey({ name: "Test Key", scopes: ["campaigns:read"] }, "user1");

      expect(apiKeyCreate).toHaveBeenCalledOnce();
      expect(result.id).toBe("clx456");
      expect(result.rawKey).toMatch(/^ign_/);
      expect(result.name).toBe("Test Key");
      expect(mockEmit).toHaveBeenCalledWith(
        "apiKey.created",
        expect.objectContaining({
          entity: "apiKey",
          entityId: "clx456",
        }),
      );
    });

    it("sets expiration when expiresInDays provided", async () => {
      apiKeyCreate.mockResolvedValue(mockApiKey);

      await createApiKey({ name: "Expiring Key", scopes: [], expiresInDays: 30 }, "user1");

      const createCall = apiKeyCreate.mock.calls[0] as Array<
        Record<string, Record<string, unknown>>
      >;
      expect(createCall[0]?.data?.expiresAt).toBeTruthy();
    });
  });

  describe("getApiKey", () => {
    it("returns API key when found", async () => {
      apiKeyFindUnique.mockResolvedValue(mockApiKey);

      const result = await getApiKey({ id: "clx456" });
      expect(result.id).toBe("clx456");
      expect(result.name).toBe("Test Key");
    });

    it("throws when not found", async () => {
      apiKeyFindUnique.mockResolvedValue(null);

      await expect(getApiKey({ id: "clx999" })).rejects.toThrow(ApiKeyServiceError);
    });
  });

  describe("listApiKeys", () => {
    it("returns paginated list", async () => {
      apiKeyFindMany.mockResolvedValue([mockApiKey]);

      const result = await listApiKeys({ limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("clx456");
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockApiKey,
        id: `clx${i}`,
      }));
      apiKeyFindMany.mockResolvedValue(items);

      const result = await listApiKeys({ limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("clx2");
    });
  });

  describe("revokeApiKey", () => {
    it("revokes an active API key", async () => {
      apiKeyFindUnique.mockResolvedValue(mockApiKey);
      apiKeyUpdate.mockResolvedValue({ ...mockApiKey, isActive: false });

      const result = await revokeApiKey({ id: "clx456" }, "user1");
      expect(result.isActive).toBe(false);
      expect(mockEmit).toHaveBeenCalledWith(
        "apiKey.revoked",
        expect.objectContaining({
          entity: "apiKey",
          entityId: "clx456",
        }),
      );
    });

    it("throws when not found", async () => {
      apiKeyFindUnique.mockResolvedValue(null);

      await expect(revokeApiKey({ id: "clx999" }, "user1")).rejects.toThrow(ApiKeyServiceError);
    });

    it("throws when already revoked", async () => {
      apiKeyFindUnique.mockResolvedValue({ ...mockApiKey, isActive: false });

      await expect(revokeApiKey({ id: "clx456" }, "user1")).rejects.toThrow(
        "API key is already revoked",
      );
    });
  });

  describe("deleteApiKey", () => {
    it("deletes API key and emits event", async () => {
      apiKeyFindUnique.mockResolvedValue(mockApiKey);
      apiKeyDelete.mockResolvedValue(mockApiKey);

      const result = await deleteApiKey({ id: "clx456" }, "user1");
      expect(result.id).toBe("clx456");
      expect(mockEmit).toHaveBeenCalledWith(
        "apiKey.deleted",
        expect.objectContaining({
          entityId: "clx456",
        }),
      );
    });

    it("throws when not found", async () => {
      apiKeyFindUnique.mockResolvedValue(null);

      await expect(deleteApiKey({ id: "clx999" }, "user1")).rejects.toThrow(ApiKeyServiceError);
    });
  });

  describe("validateApiKey", () => {
    it("returns user context for valid key", async () => {
      const rawKey = "ign_abc123def456";
      const keyHash = hashApiKey(rawKey);
      apiKeyFindUnique.mockResolvedValue({
        ...mockApiKey,
        keyHash,
        createdBy: { id: "user1", globalRole: "PLATFORM_ADMIN" },
      });
      apiKeyUpdate.mockResolvedValue(mockApiKey);

      const result = await validateApiKey(rawKey);
      expect(result).toEqual({
        userId: "user1",
        scopes: ["campaigns:read"],
      });
      expect(apiKeyUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { lastUsedAt: expect.any(Date) as Date },
        }),
      );
    });

    it("returns null for non-existent key", async () => {
      apiKeyFindUnique.mockResolvedValue(null);

      const result = await validateApiKey("ign_nonexistent");
      expect(result).toBeNull();
    });

    it("returns null for inactive key", async () => {
      apiKeyFindUnique.mockResolvedValue({
        ...mockApiKey,
        isActive: false,
        createdBy: { id: "user1", globalRole: "MEMBER" },
      });

      const result = await validateApiKey("ign_inactive");
      expect(result).toBeNull();
    });

    it("returns null for expired key", async () => {
      apiKeyFindUnique.mockResolvedValue({
        ...mockApiKey,
        expiresAt: new Date("2020-01-01"),
        createdBy: { id: "user1", globalRole: "MEMBER" },
      });

      const result = await validateApiKey("ign_expired");
      expect(result).toBeNull();
    });
  });

  describe("hashApiKey", () => {
    it("returns consistent hash for same input", () => {
      const hash1 = hashApiKey("ign_test123");
      const hash2 = hashApiKey("ign_test123");
      expect(hash1).toBe(hash2);
    });

    it("returns different hash for different input", () => {
      const hash1 = hashApiKey("ign_test123");
      const hash2 = hashApiKey("ign_test456");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("getAvailableScopes", () => {
    it("returns available scopes", () => {
      const scopes = getAvailableScopes();
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes).toContain("campaigns:read");
      expect(scopes).toContain("ideas:read");
    });
  });
});
