import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listTrends,
  getTrendById,
  createTrend,
  updateTrend,
  archiveTrend,
  deleteTrend,
  linkTrendToSia,
  unlinkTrendFromSia,
  TrendServiceError,
} from "./trend.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    trend: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    trendSiaLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    strategicInnovationArea: {
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

const trendFindUnique = prisma.trend.findUnique as unknown as Mock;
const trendFindMany = prisma.trend.findMany as unknown as Mock;
const trendCreate = prisma.trend.create as unknown as Mock;
const trendUpdate = prisma.trend.update as unknown as Mock;
const trendDelete = prisma.trend.delete as unknown as Mock;
const trendSiaLinkFindUnique = prisma.trendSiaLink.findUnique as unknown as Mock;
const trendSiaLinkCreate = prisma.trendSiaLink.create as unknown as Mock;
const trendSiaLinkDelete = prisma.trendSiaLink.delete as unknown as Mock;
const siaFindUnique = prisma.strategicInnovationArea.findUnique as unknown as Mock;

const mockTrend = {
  id: "trend-1",
  title: "Generative AI",
  description: "AI that creates content",
  imageUrl: null,
  sourceUrl: "https://example.com",
  type: "MACRO",
  isConfidential: false,
  isArchived: false,
  isCommunitySubmitted: false,
  trendOneId: null,
  businessRelevance: 8.5,
  parentId: null,
  parent: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { children: 2, sias: 1, insights: 3 },
  createdBy: { id: "user-1", name: "Admin", email: "admin@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listTrends", () => {
  it("returns paginated trends", async () => {
    trendFindMany.mockResolvedValue([mockTrend]);

    const result = await listTrends({ limit: 20, sortBy: "title", sortDirection: "asc" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Generative AI");
    expect(result.items[0].childCount).toBe(2);
    expect(result.items[0].siaCount).toBe(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by type", async () => {
    trendFindMany.mockResolvedValue([]);

    await listTrends({ limit: 20, type: "MEGA", sortBy: "title", sortDirection: "asc" });

    expect(trendFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "MEGA" }),
      }),
    );
  });

  it("filters by siaId", async () => {
    trendFindMany.mockResolvedValue([]);

    await listTrends({ limit: 20, siaId: "sia-1", sortBy: "title", sortDirection: "asc" });

    expect(trendFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sias: { some: { siaId: "sia-1" } },
        }),
      }),
    );
  });

  it("filters by search term", async () => {
    trendFindMany.mockResolvedValue([]);

    await listTrends({
      limit: 20,
      search: "generative",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(trendFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ title: { contains: "generative", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...mockTrend,
      id: `trend-${i}`,
    }));
    trendFindMany.mockResolvedValue(items);

    const result = await listTrends({ limit: 20, sortBy: "title", sortDirection: "asc" });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("trend-20");
  });
});

describe("getTrendById", () => {
  it("returns trend with relations", async () => {
    const trendWithRelations = {
      ...mockTrend,
      children: [
        { id: "child-1", title: "LLMs", type: "MICRO", isArchived: false, businessRelevance: 9.0 },
      ],
      sias: [{ sia: { id: "sia-1", name: "Digital Transform", color: "#6366F1", isActive: true } }],
      insights: [
        { insight: { id: "insight-1", title: "AI Trends 2026", sourceUrl: "https://example.com" } },
      ],
    };
    trendFindUnique.mockResolvedValue(trendWithRelations);

    const result = await getTrendById("trend-1");

    expect(result.title).toBe("Generative AI");
    expect(result.children).toHaveLength(1);
    expect(result.children[0].title).toBe("LLMs");
    expect(result.sias).toHaveLength(1);
    expect(result.sias[0].name).toBe("Digital Transform");
    expect(result.insights).toHaveLength(1);
  });

  it("throws TREND_NOT_FOUND when not found", async () => {
    trendFindUnique.mockResolvedValue(null);

    await expect(getTrendById("nonexistent")).rejects.toThrow(TrendServiceError);
    await expect(getTrendById("nonexistent")).rejects.toThrow("Trend not found");
  });
});

describe("createTrend", () => {
  it("creates a new trend and emits event", async () => {
    trendCreate.mockResolvedValue(mockTrend);

    const result = await createTrend(
      { title: "Generative AI", type: "MACRO", isConfidential: false, isCommunitySubmitted: false },
      "user-1",
    );

    expect(result.title).toBe("Generative AI");
    expect(trendCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Generative AI",
          createdById: "user-1",
        }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.created",
      expect.objectContaining({ entity: "trend", entityId: "trend-1" }),
    );
  });

  it("validates parent hierarchy", async () => {
    trendFindUnique.mockResolvedValue({ id: "parent-1", type: "MICRO" });

    await expect(
      createTrend(
        {
          title: "Bad Child",
          type: "MACRO",
          parentId: "parent-1",
          isConfidential: false,
          isCommunitySubmitted: false,
        },
        "user-1",
      ),
    ).rejects.toThrow("cannot be a child of");
  });

  it("throws when parent not found", async () => {
    trendFindUnique.mockResolvedValue(null);

    await expect(
      createTrend(
        {
          title: "Orphan",
          type: "MICRO",
          parentId: "nonexistent",
          isConfidential: false,
          isCommunitySubmitted: false,
        },
        "user-1",
      ),
    ).rejects.toThrow("Parent trend not found");
  });
});

describe("updateTrend", () => {
  it("updates trend and emits event", async () => {
    trendFindUnique.mockResolvedValue(mockTrend);
    trendUpdate.mockResolvedValue({ ...mockTrend, title: "Updated Title" });

    const result = await updateTrend({ id: "trend-1", title: "Updated Title" }, "user-1");

    expect(result.title).toBe("Updated Title");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.updated",
      expect.objectContaining({ entityId: "trend-1" }),
    );
  });

  it("prevents self-parenting", async () => {
    trendFindUnique.mockResolvedValue(mockTrend);

    await expect(updateTrend({ id: "trend-1", parentId: "trend-1" }, "user-1")).rejects.toThrow(
      "cannot be its own parent",
    );
  });

  it("throws TREND_NOT_FOUND when not found", async () => {
    trendFindUnique.mockResolvedValue(null);

    await expect(updateTrend({ id: "nonexistent", title: "x" }, "user-1")).rejects.toThrow(
      TrendServiceError,
    );
  });
});

describe("archiveTrend", () => {
  it("toggles archive state and emits event", async () => {
    trendFindUnique.mockResolvedValue({ ...mockTrend, isArchived: false });
    trendUpdate.mockResolvedValue({ ...mockTrend, isArchived: true });

    const result = await archiveTrend("trend-1", "user-1");

    expect(result.isArchived).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.archived",
      expect.objectContaining({ entityId: "trend-1" }),
    );
  });

  it("emits unarchived event when restoring", async () => {
    trendFindUnique.mockResolvedValue({ ...mockTrend, isArchived: true });
    trendUpdate.mockResolvedValue({ ...mockTrend, isArchived: false });

    await archiveTrend("trend-1", "user-1");

    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.unarchived",
      expect.objectContaining({ entityId: "trend-1" }),
    );
  });

  it("throws TREND_NOT_FOUND when not found", async () => {
    trendFindUnique.mockResolvedValue(null);

    await expect(archiveTrend("nonexistent", "user-1")).rejects.toThrow(TrendServiceError);
  });
});

describe("deleteTrend", () => {
  it("deletes trend and emits event", async () => {
    trendFindUnique.mockResolvedValue({
      id: "trend-1",
      title: "Generative AI",
      _count: { children: 0 },
    });
    trendDelete.mockResolvedValue(undefined);

    const result = await deleteTrend("trend-1", "user-1");

    expect(result.success).toBe(true);
    expect(trendDelete).toHaveBeenCalledWith({ where: { id: "trend-1" } });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.deleted",
      expect.objectContaining({ entityId: "trend-1" }),
    );
  });

  it("refuses to delete trend with children", async () => {
    trendFindUnique.mockResolvedValue({
      id: "trend-1",
      title: "Generative AI",
      _count: { children: 3 },
    });

    await expect(deleteTrend("trend-1", "user-1")).rejects.toThrow("has child trends");
  });

  it("throws TREND_NOT_FOUND when not found", async () => {
    trendFindUnique.mockResolvedValue(null);

    await expect(deleteTrend("nonexistent", "user-1")).rejects.toThrow(TrendServiceError);
  });
});

describe("linkTrendToSia", () => {
  it("links trend to SIA and emits event", async () => {
    trendFindUnique.mockResolvedValue({ id: "trend-1", title: "AI" });
    siaFindUnique.mockResolvedValue({ id: "sia-1", name: "Digital" });
    trendSiaLinkFindUnique.mockResolvedValue(null);
    trendSiaLinkCreate.mockResolvedValue({ id: "link-1" });

    const result = await linkTrendToSia({ trendId: "trend-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(trendSiaLinkCreate).toHaveBeenCalledWith({
      data: { trendId: "trend-1", siaId: "sia-1" },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.siaLinked",
      expect.objectContaining({
        entityId: "trend-1",
        metadata: expect.objectContaining({ siaId: "sia-1" }),
      }),
    );
  });

  it("returns success when already linked", async () => {
    trendFindUnique.mockResolvedValue({ id: "trend-1", title: "AI" });
    siaFindUnique.mockResolvedValue({ id: "sia-1", name: "Digital" });
    trendSiaLinkFindUnique.mockResolvedValue({ id: "existing-link" });

    const result = await linkTrendToSia({ trendId: "trend-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(trendSiaLinkCreate).not.toHaveBeenCalled();
  });

  it("throws when trend not found", async () => {
    trendFindUnique.mockResolvedValue(null);

    await expect(
      linkTrendToSia({ trendId: "nonexistent", siaId: "sia-1" }, "user-1"),
    ).rejects.toThrow("Trend not found");
  });

  it("throws when SIA not found", async () => {
    trendFindUnique.mockResolvedValue({ id: "trend-1", title: "AI" });
    siaFindUnique.mockResolvedValue(null);

    await expect(
      linkTrendToSia({ trendId: "trend-1", siaId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Strategic Innovation Area not found");
  });
});

describe("unlinkTrendFromSia", () => {
  it("unlinks trend from SIA and emits event", async () => {
    trendSiaLinkFindUnique.mockResolvedValue({ id: "link-1" });
    trendSiaLinkDelete.mockResolvedValue(undefined);

    const result = await unlinkTrendFromSia({ trendId: "trend-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(trendSiaLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "trend.siaUnlinked",
      expect.objectContaining({ entityId: "trend-1" }),
    );
  });

  it("returns success when not linked", async () => {
    trendSiaLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkTrendFromSia({ trendId: "trend-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(trendSiaLinkDelete).not.toHaveBeenCalled();
  });
});
