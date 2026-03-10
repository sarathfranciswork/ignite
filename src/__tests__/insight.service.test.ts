/**
 * Tests for Insight Service — Story 9.4 (FR79)
 *
 * Tests the business logic layer for community insights:
 * - CRUD operations
 * - Filtering and pagination
 * - Authorization checks
 * - Approval workflow
 * - Trend linking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createInsightService } from "../server/services/insight.service";

// ─── Mock Prisma Client ────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    insight: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    trendInsightLink: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

const MOCK_USER = { id: "user-1", name: "Jane Doe", avatarUrl: null };
const MOCK_CAMPAIGN = { id: "campaign-1", title: "Innovation Q1" };

function mockInsight(overrides = {}) {
  return {
    id: "insight-1",
    title: "AI Adoption Accelerating",
    content: "We're seeing rapid AI adoption across the industry…",
    insightType: "SIGNAL" as const,
    scope: "GLOBAL" as const,
    scopeEntityId: null,
    visibility: "PUBLISHED" as const,
    sourceUrl: "https://example.com/article",
    imageUrl: null,
    isEditorial: false,
    createdById: "user-1",
    campaignId: null,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    createdBy: MOCK_USER,
    campaign: null,
    trendLinks: [],
    ...overrides,
  };
}

describe("InsightService", () => {
  let prisma: MockPrisma;
  let service: ReturnType<typeof createInsightService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = createInsightService(prisma as any);
  });

  // ─── list() ───────────────────────────────────────────────────────────

  describe("list", () => {
    it("returns insights sorted by newest first with cursor pagination", async () => {
      const insights = [
        mockInsight({ id: "i-1", createdAt: new Date("2026-03-02") }),
        mockInsight({ id: "i-2", createdAt: new Date("2026-03-01") }),
      ];
      prisma.insight.findMany.mockResolvedValue(insights);

      const result = await service.list({});

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
          take: 21,
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by visibility (defaults to PUBLISHED)", async () => {
      prisma.insight.findMany.mockResolvedValue([]);

      await service.list({});

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: "PUBLISHED",
          }),
        }),
      );
    });

    it("filters by campaignId", async () => {
      prisma.insight.findMany.mockResolvedValue([]);

      await service.list({ campaignId: "campaign-1" });

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: "campaign-1",
          }),
        }),
      );
    });

    it("filters by insightType", async () => {
      prisma.insight.findMany.mockResolvedValue([]);

      await service.list({ insightType: "OPPORTUNITY" });

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            insightType: "OPPORTUNITY",
          }),
        }),
      );
    });

    it("filters by trendId via trendLinks relation", async () => {
      prisma.insight.findMany.mockResolvedValue([]);

      await service.list({ trendId: "trend-1" });

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trendLinks: { some: { trendId: "trend-1" } },
          }),
        }),
      );
    });

    it("supports text search across title and content", async () => {
      prisma.insight.findMany.mockResolvedValue([]);

      await service.list({ search: "AI adoption" });

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: "AI adoption", mode: "insensitive" } },
              { content: { contains: "AI adoption", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("paginates with hasMore when items exceed limit", async () => {
      const items = Array.from({ length: 6 }, (_, i) =>
        mockInsight({ id: `i-${i}` }),
      );
      prisma.insight.findMany.mockResolvedValue(items);

      const result = await service.list({ limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe("i-4");
    });

    it("caps limit at MAX_PAGE_SIZE (100)", async () => {
      prisma.insight.findMany.mockResolvedValue([]);

      await service.list({ limit: 500 });

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 }),
      );
    });
  });

  // ─── getById() ────────────────────────────────────────────────────────

  describe("getById", () => {
    it("returns formatted insight when found", async () => {
      prisma.insight.findUnique.mockResolvedValue(mockInsight());

      const result = await service.getById("insight-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("insight-1");
      expect(result?.author).toEqual(MOCK_USER);
    });

    it("returns null when insight not found", async () => {
      prisma.insight.findUnique.mockResolvedValue(null);

      const result = await service.getById("nonexistent");

      expect(result).toBeNull();
    });
  });

  // ─── create() ─────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates insight with PUBLISHED visibility by default", async () => {
      prisma.insight.create.mockResolvedValue(mockInsight());

      await service.create({
        title: "New Signal",
        content: "Interesting observation",
        insightType: "SIGNAL",
        scope: "GLOBAL",
        createdById: "user-1",
      });

      expect(prisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibility: "PUBLISHED",
          }),
        }),
      );
    });

    it("creates insight with PENDING_APPROVAL when requiresApproval is true", async () => {
      prisma.insight.create.mockResolvedValue(
        mockInsight({ visibility: "PENDING_APPROVAL" }),
      );

      await service.create({
        title: "New Signal",
        content: "Needs approval",
        insightType: "SIGNAL",
        scope: "GLOBAL",
        createdById: "user-1",
        requiresApproval: true,
      });

      expect(prisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibility: "PENDING_APPROVAL",
          }),
        }),
      );
    });

    it("links to trends when trendIds are provided", async () => {
      prisma.insight.create.mockResolvedValue(mockInsight());

      await service.create({
        title: "Trend-related",
        content: "Linked to trends",
        insightType: "OBSERVATION",
        scope: "TREND",
        scopeEntityId: "trend-1",
        createdById: "user-1",
        trendIds: ["trend-1", "trend-2"],
      });

      expect(prisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trendLinks: {
              create: [{ trendId: "trend-1" }, { trendId: "trend-2" }],
            },
          }),
        }),
      );
    });

    it("sets campaignId when scope is CAMPAIGN", async () => {
      prisma.insight.create.mockResolvedValue(
        mockInsight({ campaignId: "campaign-1" }),
      );

      await service.create({
        title: "Campaign insight",
        content: "Within campaign context",
        insightType: "OPPORTUNITY",
        scope: "CAMPAIGN",
        scopeEntityId: "campaign-1",
        createdById: "user-1",
      });

      expect(prisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignId: "campaign-1",
          }),
        }),
      );
    });
  });

  // ─── update() ─────────────────────────────────────────────────────────

  describe("update", () => {
    it("updates insight when user is the author", async () => {
      prisma.insight.findUnique.mockResolvedValue({ createdById: "user-1" });
      prisma.insight.update.mockResolvedValue(
        mockInsight({ title: "Updated Title" }),
      );

      const result = await service.update(
        "insight-1",
        { title: "Updated Title" },
        "user-1",
      );

      expect(result.title).toBe("Updated Title");
    });

    it("throws when user is not the author", async () => {
      prisma.insight.findUnique.mockResolvedValue({ createdById: "user-1" });

      await expect(
        service.update("insight-1", { title: "Hacked!" }, "user-2"),
      ).rejects.toThrow("Not authorized to update this insight");
    });

    it("throws when insight not found", async () => {
      prisma.insight.findUnique.mockResolvedValue(null);

      await expect(
        service.update("nonexistent", { title: "Nope" }, "user-1"),
      ).rejects.toThrow("Insight not found");
    });
  });

  // ─── archive() ────────────────────────────────────────────────────────

  describe("archive", () => {
    it("soft-deletes by setting visibility to ARCHIVED", async () => {
      prisma.insight.findUnique.mockResolvedValue({ createdById: "user-1" });
      prisma.insight.update.mockResolvedValue({});

      await service.archive("insight-1", "user-1");

      expect(prisma.insight.update).toHaveBeenCalledWith({
        where: { id: "insight-1" },
        data: { visibility: "ARCHIVED" },
      });
    });

    it("throws when user is not the author", async () => {
      prisma.insight.findUnique.mockResolvedValue({ createdById: "user-1" });

      await expect(service.archive("insight-1", "user-2")).rejects.toThrow(
        "Not authorized to archive this insight",
      );
    });
  });

  // ─── approve() ────────────────────────────────────────────────────────

  describe("approve", () => {
    it("sets visibility to PUBLISHED for pending insights", async () => {
      prisma.insight.findUnique.mockResolvedValue({
        visibility: "PENDING_APPROVAL",
      });
      prisma.insight.update.mockResolvedValue(mockInsight());

      await service.approve("insight-1");

      expect(prisma.insight.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "insight-1" },
          data: { visibility: "PUBLISHED" },
        }),
      );
    });

    it("throws when insight is not pending approval", async () => {
      prisma.insight.findUnique.mockResolvedValue({
        visibility: "PUBLISHED",
      });

      await expect(service.approve("insight-1")).rejects.toThrow(
        "Insight is not pending approval",
      );
    });

    it("throws when insight not found", async () => {
      prisma.insight.findUnique.mockResolvedValue(null);

      await expect(service.approve("nonexistent")).rejects.toThrow(
        "Insight not found",
      );
    });
  });

  // ─── linkToTrend() / unlinkFromTrend() ────────────────────────────────

  describe("linkToTrend", () => {
    it("creates a trend-insight link", async () => {
      prisma.trendInsightLink.create.mockResolvedValue({
        id: "link-1",
        insightId: "insight-1",
        trendId: "trend-1",
      });

      const result = await service.linkToTrend("insight-1", "trend-1");

      expect(prisma.trendInsightLink.create).toHaveBeenCalledWith({
        data: { insightId: "insight-1", trendId: "trend-1" },
      });
      expect(result.trendId).toBe("trend-1");
    });
  });

  describe("unlinkFromTrend", () => {
    it("removes a trend-insight link", async () => {
      prisma.trendInsightLink.deleteMany.mockResolvedValue({ count: 1 });

      await service.unlinkFromTrend("insight-1", "trend-1");

      expect(prisma.trendInsightLink.deleteMany).toHaveBeenCalledWith({
        where: { insightId: "insight-1", trendId: "trend-1" },
      });
    });
  });

  // ─── getByTrend() ─────────────────────────────────────────────────────

  describe("getByTrend", () => {
    it("fetches published insights linked to a specific trend", async () => {
      prisma.insight.findMany.mockResolvedValue([mockInsight()]);

      await service.getByTrend("trend-1");

      expect(prisma.insight.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            visibility: "PUBLISHED",
            trendLinks: { some: { trendId: "trend-1" } },
          },
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });
});
