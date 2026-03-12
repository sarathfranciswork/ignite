import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listInsights,
  getInsightById,
  createInsight,
  updateInsight,
  archiveInsight,
  deleteInsight,
  linkInsightToTrend,
  unlinkInsightFromTrend,
  InsightServiceError,
} from "./insight.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    insight: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    trendInsightLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    trend: {
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

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const insightFindUnique = prisma.insight.findUnique as unknown as Mock;
const insightFindMany = prisma.insight.findMany as unknown as Mock;
const insightCreate = prisma.insight.create as unknown as Mock;
const insightUpdate = prisma.insight.update as unknown as Mock;
const insightDelete = prisma.insight.delete as unknown as Mock;
const trendInsightLinkFindUnique = prisma.trendInsightLink.findUnique as unknown as Mock;
const trendInsightLinkCreate = prisma.trendInsightLink.create as unknown as Mock;
const trendInsightLinkDelete = prisma.trendInsightLink.delete as unknown as Mock;
const trendFindUnique = prisma.trend.findUnique as unknown as Mock;

const mockInsight = {
  id: "insight-1",
  title: "AI adoption accelerating in healthcare",
  description: "Multiple hospitals adopting AI diagnostics",
  type: "SIGNAL",
  scope: "GLOBAL",
  sourceUrl: "https://example.com/ai-healthcare",
  isEditorial: false,
  isArchived: false,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { trendLinks: 2 },
  createdBy: { id: "user-1", name: "Admin", email: "admin@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listInsights", () => {
  it("returns paginated insights sorted by newest first", async () => {
    insightFindMany.mockResolvedValue([mockInsight]);

    const result = await listInsights({ limit: 20, sortBy: "createdAt", sortDirection: "desc" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("AI adoption accelerating in healthcare");
    expect(result.items[0].trendCount).toBe(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by type", async () => {
    insightFindMany.mockResolvedValue([]);

    await listInsights({
      limit: 20,
      type: "RISK",
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    expect(insightFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "RISK" }),
      }),
    );
  });

  it("filters by scope", async () => {
    insightFindMany.mockResolvedValue([]);

    await listInsights({
      limit: 20,
      scope: "CAMPAIGN",
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    expect(insightFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "CAMPAIGN" }),
      }),
    );
  });

  it("filters by trendId", async () => {
    insightFindMany.mockResolvedValue([]);

    await listInsights({
      limit: 20,
      trendId: "trend-1",
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    expect(insightFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trendLinks: { some: { trendId: "trend-1" } },
        }),
      }),
    );
  });

  it("filters by search term", async () => {
    insightFindMany.mockResolvedValue([]);

    await listInsights({
      limit: 20,
      search: "healthcare",
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    expect(insightFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ title: { contains: "healthcare", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...mockInsight,
      id: `insight-${i}`,
    }));
    insightFindMany.mockResolvedValue(items);

    const result = await listInsights({ limit: 20, sortBy: "createdAt", sortDirection: "desc" });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("insight-20");
  });
});

describe("getInsightById", () => {
  it("returns insight with linked trends", async () => {
    const insightWithTrends = {
      ...mockInsight,
      trendLinks: [{ trend: { id: "trend-1", title: "AI Trends", type: "MACRO" } }],
    };
    insightFindUnique.mockResolvedValue(insightWithTrends);

    const result = await getInsightById("insight-1");

    expect(result.title).toBe("AI adoption accelerating in healthcare");
    expect(result.trends).toHaveLength(1);
    expect(result.trends[0].title).toBe("AI Trends");
  });

  it("throws INSIGHT_NOT_FOUND when not found", async () => {
    insightFindUnique.mockResolvedValue(null);

    await expect(getInsightById("nonexistent")).rejects.toThrow(InsightServiceError);
    await expect(getInsightById("nonexistent")).rejects.toThrow("Insight not found");
  });
});

describe("createInsight", () => {
  it("creates a new insight and emits event", async () => {
    insightCreate.mockResolvedValue(mockInsight);

    const result = await createInsight(
      {
        title: "AI adoption accelerating in healthcare",
        type: "SIGNAL",
        scope: "GLOBAL",
        isEditorial: false,
      },
      "user-1",
    );

    expect(result.title).toBe("AI adoption accelerating in healthcare");
    expect(insightCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "AI adoption accelerating in healthcare",
          type: "SIGNAL",
          scope: "GLOBAL",
          createdById: "user-1",
        }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.created",
      expect.objectContaining({ entity: "insight", entityId: "insight-1" }),
    );
  });
});

describe("updateInsight", () => {
  it("updates insight and emits event", async () => {
    insightFindUnique.mockResolvedValue(mockInsight);
    insightUpdate.mockResolvedValue({ ...mockInsight, title: "Updated Title" });

    const result = await updateInsight({ id: "insight-1", title: "Updated Title" }, "user-1");

    expect(result.title).toBe("Updated Title");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.updated",
      expect.objectContaining({ entityId: "insight-1" }),
    );
  });

  it("throws INSIGHT_NOT_FOUND when not found", async () => {
    insightFindUnique.mockResolvedValue(null);

    await expect(updateInsight({ id: "nonexistent", title: "x" }, "user-1")).rejects.toThrow(
      InsightServiceError,
    );
  });
});

describe("archiveInsight", () => {
  it("toggles archive state and emits event", async () => {
    insightFindUnique.mockResolvedValue({ ...mockInsight, isArchived: false });
    insightUpdate.mockResolvedValue({ ...mockInsight, isArchived: true });

    const result = await archiveInsight("insight-1", "user-1");

    expect(result.isArchived).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.archived",
      expect.objectContaining({ entityId: "insight-1" }),
    );
  });

  it("emits unarchived event when restoring", async () => {
    insightFindUnique.mockResolvedValue({ ...mockInsight, isArchived: true });
    insightUpdate.mockResolvedValue({ ...mockInsight, isArchived: false });

    await archiveInsight("insight-1", "user-1");

    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.unarchived",
      expect.objectContaining({ entityId: "insight-1" }),
    );
  });

  it("throws INSIGHT_NOT_FOUND when not found", async () => {
    insightFindUnique.mockResolvedValue(null);

    await expect(archiveInsight("nonexistent", "user-1")).rejects.toThrow(InsightServiceError);
  });
});

describe("deleteInsight", () => {
  it("deletes insight and emits event", async () => {
    insightFindUnique.mockResolvedValue({ id: "insight-1", title: "Test Insight" });
    insightDelete.mockResolvedValue(undefined);

    const result = await deleteInsight("insight-1", "user-1");

    expect(result.success).toBe(true);
    expect(insightDelete).toHaveBeenCalledWith({ where: { id: "insight-1" } });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.deleted",
      expect.objectContaining({ entityId: "insight-1" }),
    );
  });

  it("throws INSIGHT_NOT_FOUND when not found", async () => {
    insightFindUnique.mockResolvedValue(null);

    await expect(deleteInsight("nonexistent", "user-1")).rejects.toThrow(InsightServiceError);
  });
});

describe("linkInsightToTrend", () => {
  it("links insight to trend and emits event", async () => {
    insightFindUnique.mockResolvedValue({ id: "insight-1", title: "Test" });
    trendFindUnique.mockResolvedValue({ id: "trend-1", title: "AI Trends" });
    trendInsightLinkFindUnique.mockResolvedValue(null);
    trendInsightLinkCreate.mockResolvedValue({ id: "link-1" });

    const result = await linkInsightToTrend(
      { insightId: "insight-1", trendId: "trend-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(trendInsightLinkCreate).toHaveBeenCalledWith({
      data: { trendId: "trend-1", insightId: "insight-1" },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.trendLinked",
      expect.objectContaining({
        entityId: "insight-1",
        metadata: expect.objectContaining({ trendId: "trend-1" }),
      }),
    );
  });

  it("returns success when already linked", async () => {
    insightFindUnique.mockResolvedValue({ id: "insight-1", title: "Test" });
    trendFindUnique.mockResolvedValue({ id: "trend-1", title: "AI Trends" });
    trendInsightLinkFindUnique.mockResolvedValue({ id: "existing-link" });

    const result = await linkInsightToTrend(
      { insightId: "insight-1", trendId: "trend-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(trendInsightLinkCreate).not.toHaveBeenCalled();
  });

  it("throws when insight not found", async () => {
    insightFindUnique.mockResolvedValue(null);

    await expect(
      linkInsightToTrend({ insightId: "nonexistent", trendId: "trend-1" }, "user-1"),
    ).rejects.toThrow("Insight not found");
  });

  it("throws when trend not found", async () => {
    insightFindUnique.mockResolvedValue({ id: "insight-1", title: "Test" });
    trendFindUnique.mockResolvedValue(null);

    await expect(
      linkInsightToTrend({ insightId: "insight-1", trendId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Trend not found");
  });
});

describe("unlinkInsightFromTrend", () => {
  it("unlinks insight from trend and emits event", async () => {
    trendInsightLinkFindUnique.mockResolvedValue({ id: "link-1" });
    trendInsightLinkDelete.mockResolvedValue(undefined);

    const result = await unlinkInsightFromTrend(
      { insightId: "insight-1", trendId: "trend-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(trendInsightLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "insight.trendUnlinked",
      expect.objectContaining({ entityId: "insight-1" }),
    );
  });

  it("returns success when not linked", async () => {
    trendInsightLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkInsightFromTrend(
      { insightId: "insight-1", trendId: "trend-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(trendInsightLinkDelete).not.toHaveBeenCalled();
  });
});
