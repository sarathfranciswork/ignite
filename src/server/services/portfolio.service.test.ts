import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  addItemToPortfolio,
  removeItemFromPortfolio,
  reorderPortfolioItems,
  getPortfolioAnalytics,
  PortfolioServiceError,
} from "./portfolio.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    innovationPortfolio: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    portfolioItem: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    trend: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    technology: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    strategicInnovationArea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
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

const portfolioFindUnique = prisma.innovationPortfolio.findUnique as unknown as Mock;
const portfolioFindMany = prisma.innovationPortfolio.findMany as unknown as Mock;
const portfolioCreate = prisma.innovationPortfolio.create as unknown as Mock;
const portfolioUpdate = prisma.innovationPortfolio.update as unknown as Mock;
const _portfolioDelete = prisma.innovationPortfolio.delete as unknown as Mock;
const portfolioItemFindUnique = prisma.portfolioItem.findUnique as unknown as Mock;
const portfolioItemCreate = prisma.portfolioItem.create as unknown as Mock;
const _portfolioItemDelete = prisma.portfolioItem.delete as unknown as Mock;
const portfolioItemAggregate = prisma.portfolioItem.aggregate as unknown as Mock;
const trendFindUnique = prisma.trend.findUnique as unknown as Mock;
const _trendFindMany = prisma.trend.findMany as unknown as Mock;
const siaFindMany = prisma.strategicInnovationArea.findMany as unknown as Mock;

const mockPortfolio = {
  id: "portfolio-1",
  title: "Q1 Innovation Landscape",
  description: "Overview of trends and technologies for Q1",
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
  _count: { items: 3 },
  createdBy: { id: "user-1", name: "Admin User", email: "admin@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listPortfolios", () => {
  it("returns paginated portfolios", async () => {
    portfolioFindMany.mockResolvedValue([mockPortfolio]);

    const result = await listPortfolios({
      limit: 20,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Q1 Innovation Landscape");
    expect(result.items[0].itemCount).toBe(3);
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by search term", async () => {
    portfolioFindMany.mockResolvedValue([]);

    await listPortfolios({
      limit: 20,
      search: "innovation",
      sortBy: "updatedAt",
      sortDirection: "desc",
    });

    expect(portfolioFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ title: { contains: "innovation", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...mockPortfolio,
      id: `portfolio-${i}`,
    }));
    portfolioFindMany.mockResolvedValue(items);

    const result = await listPortfolios({
      limit: 20,
      sortBy: "updatedAt",
      sortDirection: "desc",
    });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("portfolio-20");
  });
});

describe("getPortfolioById", () => {
  it("returns portfolio with enriched items", async () => {
    portfolioFindUnique.mockResolvedValue({
      ...mockPortfolio,
      items: [],
    });

    const result = await getPortfolioById("portfolio-1");

    expect(result.title).toBe("Q1 Innovation Landscape");
    expect(result.items).toHaveLength(0);
  });

  it("throws PORTFOLIO_NOT_FOUND when not found", async () => {
    portfolioFindUnique.mockResolvedValue(null);

    await expect(getPortfolioById("nonexistent")).rejects.toThrow(PortfolioServiceError);
    await expect(getPortfolioById("nonexistent")).rejects.toThrow("Innovation Portfolio not found");
  });
});

describe("createPortfolio", () => {
  it("creates a new portfolio and emits event", async () => {
    portfolioCreate.mockResolvedValue(mockPortfolio);

    const result = await createPortfolio(
      { title: "Q1 Innovation Landscape", description: "Overview" },
      "user-1",
    );

    expect(result.title).toBe("Q1 Innovation Landscape");
    expect(portfolioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Q1 Innovation Landscape",
          createdById: "user-1",
        }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "portfolio.created",
      expect.objectContaining({ entity: "portfolio", entityId: "portfolio-1" }),
    );
  });
});

describe("updatePortfolio", () => {
  it("updates portfolio and emits event", async () => {
    portfolioFindUnique.mockResolvedValue(mockPortfolio);
    portfolioUpdate.mockResolvedValue({ ...mockPortfolio, title: "Updated Title" });

    const result = await updatePortfolio({ id: "portfolio-1", title: "Updated Title" }, "user-1");

    expect(result.title).toBe("Updated Title");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "portfolio.updated",
      expect.objectContaining({ entityId: "portfolio-1" }),
    );
  });

  it("throws PORTFOLIO_NOT_FOUND when not found", async () => {
    portfolioFindUnique.mockResolvedValue(null);

    await expect(updatePortfolio({ id: "nonexistent", title: "x" }, "user-1")).rejects.toThrow(
      PortfolioServiceError,
    );
  });
});

describe("deletePortfolio", () => {
  it("deletes portfolio and emits event", async () => {
    portfolioFindUnique.mockResolvedValue({ id: "portfolio-1", title: "Test" });

    const result = await deletePortfolio("portfolio-1", "user-1");

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "portfolio.deleted",
      expect.objectContaining({ entityId: "portfolio-1" }),
    );
  });

  it("throws PORTFOLIO_NOT_FOUND when not found", async () => {
    portfolioFindUnique.mockResolvedValue(null);

    await expect(deletePortfolio("nonexistent", "user-1")).rejects.toThrow(PortfolioServiceError);
  });
});

describe("addItemToPortfolio", () => {
  it("adds item to portfolio and emits event", async () => {
    portfolioFindUnique.mockResolvedValue({ id: "portfolio-1", title: "Test" });
    trendFindUnique.mockResolvedValue({ id: "trend-1" });
    portfolioItemAggregate.mockResolvedValue({ _max: { position: 2 } });
    portfolioItemCreate.mockResolvedValue({
      id: "item-1",
      portfolioId: "portfolio-1",
      entityType: "TREND",
      entityId: "trend-1",
      position: 3,
    });

    const result = await addItemToPortfolio(
      { portfolioId: "portfolio-1", entityType: "TREND", entityId: "trend-1" },
      "user-1",
    );

    expect(result.id).toBe("item-1");
    expect(result.position).toBe(3);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "portfolio.itemAdded",
      expect.objectContaining({
        entityId: "portfolio-1",
        metadata: expect.objectContaining({ entityType: "TREND" }),
      }),
    );
  });

  it("throws PORTFOLIO_NOT_FOUND when portfolio not found", async () => {
    portfolioFindUnique.mockResolvedValue(null);

    await expect(
      addItemToPortfolio(
        { portfolioId: "nonexistent", entityType: "TREND", entityId: "trend-1" },
        "user-1",
      ),
    ).rejects.toThrow("Innovation Portfolio not found");
  });

  it("throws ENTITY_NOT_FOUND when entity does not exist", async () => {
    portfolioFindUnique.mockResolvedValue({ id: "portfolio-1", title: "Test" });
    trendFindUnique.mockResolvedValue(null);

    await expect(
      addItemToPortfolio(
        { portfolioId: "portfolio-1", entityType: "TREND", entityId: "nonexistent" },
        "user-1",
      ),
    ).rejects.toThrow("TREND entity not found");
  });
});

describe("removeItemFromPortfolio", () => {
  it("removes item from portfolio and emits event", async () => {
    portfolioItemFindUnique.mockResolvedValue({
      id: "item-1",
      portfolioId: "portfolio-1",
      entityType: "TREND",
      entityId: "trend-1",
    });

    const result = await removeItemFromPortfolio(
      { portfolioId: "portfolio-1", itemId: "item-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "portfolio.itemRemoved",
      expect.objectContaining({ entityId: "portfolio-1" }),
    );
  });

  it("throws ITEM_NOT_FOUND when item not found", async () => {
    portfolioItemFindUnique.mockResolvedValue(null);

    await expect(
      removeItemFromPortfolio({ portfolioId: "portfolio-1", itemId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Portfolio item not found");
  });

  it("throws ITEM_NOT_FOUND when item belongs to different portfolio", async () => {
    portfolioItemFindUnique.mockResolvedValue({
      id: "item-1",
      portfolioId: "portfolio-2",
      entityType: "TREND",
      entityId: "trend-1",
    });

    await expect(
      removeItemFromPortfolio({ portfolioId: "portfolio-1", itemId: "item-1" }, "user-1"),
    ).rejects.toThrow("Portfolio item not found");
  });
});

describe("reorderPortfolioItems", () => {
  it("reorders items and emits event", async () => {
    portfolioFindUnique.mockResolvedValue({ id: "portfolio-1" });

    const result = await reorderPortfolioItems(
      {
        portfolioId: "portfolio-1",
        items: [
          { id: "item-1", position: 0 },
          { id: "item-2", position: 1 },
        ],
      },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "portfolio.itemsReordered",
      expect.objectContaining({
        entityId: "portfolio-1",
        metadata: expect.objectContaining({ itemCount: 2 }),
      }),
    );
  });

  it("throws PORTFOLIO_NOT_FOUND when portfolio not found", async () => {
    portfolioFindUnique.mockResolvedValue(null);

    await expect(
      reorderPortfolioItems({ portfolioId: "nonexistent", items: [] }, "user-1"),
    ).rejects.toThrow(PortfolioServiceError);
  });
});

describe("getPortfolioAnalytics", () => {
  it("returns analytics data", async () => {
    portfolioFindUnique.mockResolvedValue({
      ...mockPortfolio,
      items: [
        {
          id: "item-1",
          entityType: "TREND",
          entityId: "trend-1",
          bucketLabel: "High Priority",
          position: 0,
        },
        {
          id: "item-2",
          entityType: "SIA",
          entityId: "sia-1",
          bucketLabel: "High Priority",
          position: 1,
        },
        {
          id: "item-3",
          entityType: "IDEA",
          entityId: "idea-1",
          bucketLabel: null,
          position: 2,
        },
      ],
    });
    siaFindMany.mockResolvedValue([{ id: "sia-1", name: "Digital", color: "#6366F1" }]);

    const result = await getPortfolioAnalytics("portfolio-1");

    expect(result.totalItems).toBe(3);
    expect(result.typeCounts.TREND).toBe(1);
    expect(result.typeCounts.SIA).toBe(1);
    expect(result.typeCounts.IDEA).toBe(1);
    expect(result.bucketCounts["High Priority"]).toBe(2);
    expect(result.bucketCounts["Uncategorized"]).toBe(1);
    expect(result.siaCoverage).toHaveLength(1);
  });

  it("throws PORTFOLIO_NOT_FOUND when not found", async () => {
    portfolioFindUnique.mockResolvedValue(null);

    await expect(getPortfolioAnalytics("nonexistent")).rejects.toThrow(PortfolioServiceError);
  });
});
