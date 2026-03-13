import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createClip, listClips, ClipServiceError } from "./clip.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    trend: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    insight: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    idea: {
      create: vi.fn(),
    },
    campaign: {
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

const trendCreate = prisma.trend.create as unknown as Mock;
const trendFindMany = prisma.trend.findMany as unknown as Mock;
const insightCreate = prisma.insight.create as unknown as Mock;
const insightFindMany = prisma.insight.findMany as unknown as Mock;
const ideaCreate = prisma.idea.create as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createClip", () => {
  describe("trend clip", () => {
    it("creates a trend from clipped content", async () => {
      trendCreate.mockResolvedValue({
        id: "trend-1",
        title: "AI in Healthcare",
        sourceUrl: "https://example.com/article",
        createdAt: new Date("2026-01-01"),
      });

      const result = await createClip(
        {
          url: "https://example.com/article",
          title: "AI in Healthcare",
          excerpt: "<p>Interesting article</p>",
          type: "trend",
        },
        "user-1",
      );

      expect(result.type).toBe("trend");
      expect(result.id).toBe("trend-1");
      expect(result.viewPath).toBe("/strategy/trends");
      expect(trendCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "AI in Healthcare",
            description: "Interesting article",
            sourceUrl: "https://example.com/article",
            type: "MICRO",
            isCommunitySubmitted: true,
            createdById: "user-1",
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "clip.created",
        expect.objectContaining({ entity: "trend", entityId: "trend-1" }),
      );
    });
  });

  describe("insight clip", () => {
    it("creates an insight from clipped content", async () => {
      insightCreate.mockResolvedValue({
        id: "insight-1",
        title: "Market Signal",
        sourceUrl: "https://example.com/signal",
        createdAt: new Date("2026-01-01"),
      });

      const result = await createClip(
        {
          url: "https://example.com/signal",
          title: "Market Signal",
          type: "insight",
        },
        "user-1",
      );

      expect(result.type).toBe("insight");
      expect(result.id).toBe("insight-1");
      expect(result.viewPath).toBe("/strategy/insights");
      expect(insightCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Market Signal",
            sourceUrl: "https://example.com/signal",
            type: "SIGNAL",
            scope: "GLOBAL",
            createdById: "user-1",
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "clip.created",
        expect.objectContaining({ entity: "insight", entityId: "insight-1" }),
      );
    });
  });

  describe("idea clip", () => {
    it("creates a draft idea from clipped content", async () => {
      campaignFindUnique.mockResolvedValue({ id: "campaign-1", title: "Q1 Ideas" });
      ideaCreate.mockResolvedValue({
        id: "idea-1",
        title: "New Idea",
        campaignId: "campaign-1",
        createdAt: new Date("2026-01-01"),
      });

      const result = await createClip(
        {
          url: "https://example.com/inspiration",
          title: "New Idea",
          excerpt: "Some inspiration",
          type: "idea",
          campaignId: "campaign-1",
          tags: ["tech", "innovation"],
        },
        "user-1",
      );

      expect(result.type).toBe("idea");
      expect(result.id).toBe("idea-1");
      expect(result.viewPath).toBe("/campaigns/campaign-1/ideas/idea-1");
      expect(ideaCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "New Idea",
            status: "DRAFT",
            campaignId: "campaign-1",
            contributorId: "user-1",
            tags: ["tech", "innovation"],
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "clip.created",
        expect.objectContaining({ entity: "idea", entityId: "idea-1" }),
      );
    });

    it("throws CAMPAIGN_REQUIRED when campaignId is missing for idea", async () => {
      await expect(
        createClip(
          {
            url: "https://example.com",
            title: "Test",
            type: "idea",
          },
          "user-1",
        ),
      ).rejects.toThrow(ClipServiceError);

      await expect(
        createClip(
          {
            url: "https://example.com",
            title: "Test",
            type: "idea",
          },
          "user-1",
        ),
      ).rejects.toThrow("campaignId is required");
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(
        createClip(
          {
            url: "https://example.com",
            title: "Test",
            type: "idea",
            campaignId: "nonexistent",
          },
          "user-1",
        ),
      ).rejects.toThrow("Campaign not found");
    });
  });

  it("sanitizes HTML in excerpt", async () => {
    trendCreate.mockResolvedValue({
      id: "trend-1",
      title: "Test",
      sourceUrl: "https://example.com",
      createdAt: new Date("2026-01-01"),
    });

    await createClip(
      {
        url: "https://example.com",
        title: "Test",
        excerpt: '<script>alert("xss")</script><p>Clean text</p>',
        type: "trend",
      },
      "user-1",
    );

    expect(trendCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: 'alert("xss")Clean text',
        }),
      }),
    );
  });

  it("throws INVALID_URL for malformed URLs", async () => {
    await expect(
      createClip(
        {
          url: "not-a-url",
          title: "Test",
          type: "trend",
        },
        "user-1",
      ),
    ).rejects.toThrow("not valid");
  });
});

describe("listClips", () => {
  it("returns combined and sorted clips", async () => {
    trendFindMany.mockResolvedValue([
      {
        id: "trend-1",
        title: "Trend A",
        sourceUrl: "https://example.com/a",
        createdAt: new Date("2026-01-02"),
      },
    ]);
    insightFindMany.mockResolvedValue([
      {
        id: "insight-1",
        title: "Insight B",
        sourceUrl: "https://example.com/b",
        createdAt: new Date("2026-01-03"),
      },
    ]);

    const result = await listClips({ limit: 20 }, "user-1");

    expect(result.items).toHaveLength(2);
    // Insight is newer, should be first
    expect(result.items[0].type).toBe("insight");
    expect(result.items[1].type).toBe("trend");
  });

  it("respects limit", async () => {
    trendFindMany.mockResolvedValue([
      {
        id: "trend-1",
        title: "T1",
        sourceUrl: "https://example.com/1",
        createdAt: new Date("2026-01-01"),
      },
    ]);
    insightFindMany.mockResolvedValue([
      {
        id: "insight-1",
        title: "I1",
        sourceUrl: "https://example.com/2",
        createdAt: new Date("2026-01-02"),
      },
    ]);

    const result = await listClips({ limit: 1 }, "user-1");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("insight");
  });
});
