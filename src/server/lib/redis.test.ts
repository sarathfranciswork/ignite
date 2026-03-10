import { describe, it, expect, beforeEach } from "vitest";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern, clearMemoryCache } from "./redis";

describe("redis (memory cache fallback)", () => {
  beforeEach(() => {
    clearMemoryCache();
  });

  describe("cacheGet / cacheSet", () => {
    it("returns null for missing keys", async () => {
      const result = await cacheGet("nonexistent");
      expect(result).toBeNull();
    });

    it("stores and retrieves a value", async () => {
      await cacheSet("key1", "value1", 60);
      const result = await cacheGet("key1");
      expect(result).toBe("value1");
    });

    it("returns null for expired entries", async () => {
      await cacheSet("key2", "value2", 0); // 0 seconds TTL = already expired
      // Wait a tick for expiration to take effect
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = await cacheGet("key2");
      expect(result).toBeNull();
    });
  });

  describe("cacheDel", () => {
    it("deletes a cached entry", async () => {
      await cacheSet("key3", "value3", 60);
      await cacheDel("key3");
      const result = await cacheGet("key3");
      expect(result).toBeNull();
    });

    it("does not throw when deleting nonexistent key", async () => {
      await expect(cacheDel("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("cacheDelPattern", () => {
    it("deletes entries matching a glob pattern", async () => {
      await cacheSet("rbac:resource:user-1:campaign-1", "val1", 60);
      await cacheSet("rbac:resource:user-1:campaign-2", "val2", 60);
      await cacheSet("rbac:resource:user-2:campaign-1", "val3", 60);

      await cacheDelPattern("rbac:resource:user-1:*");

      expect(await cacheGet("rbac:resource:user-1:campaign-1")).toBeNull();
      expect(await cacheGet("rbac:resource:user-1:campaign-2")).toBeNull();
      expect(await cacheGet("rbac:resource:user-2:campaign-1")).toBe("val3");
    });
  });

  describe("clearMemoryCache", () => {
    it("clears all entries", async () => {
      await cacheSet("a", "1", 60);
      await cacheSet("b", "2", 60);
      clearMemoryCache();
      expect(await cacheGet("a")).toBeNull();
      expect(await cacheGet("b")).toBeNull();
    });
  });
});
