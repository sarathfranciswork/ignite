import { describe, it, expect, vi, beforeEach } from "vitest";
import { findSimilarIdeas, getAiStatus } from "./similarity.service";

// Mock dependencies
vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

vi.mock("@/server/lib/ai/factory", () => ({
  aiProvider: {
    name: "test",
    isAvailable: vi.fn().mockReturnValue(false),
    generateEmbedding: vi.fn(),
    findSimilar: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/server/jobs/embedding.job", () => ({
  buildEmbeddingText: vi.fn().mockReturnValue("test text"),
}));

describe("getAiStatus", () => {
  it("returns provider status", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    const status = getAiStatus();

    expect(status).toEqual({
      available: false,
      provider: "test",
    });
  });

  it("returns available when provider is available", async () => {
    const { aiProvider } = await import("@/server/lib/ai/factory");
    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);

    const status = getAiStatus();

    expect(status).toEqual({
      available: true,
      provider: "test",
    });
  });
});

describe("findSimilarIdeas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when idea not found", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    vi.mocked(prisma.idea.findUnique).mockResolvedValue(null);

    const results = await findSimilarIdeas({ ideaId: "nonexistent", limit: 5 });

    expect(results).toEqual([]);
  });

  it("falls back to text search when AI is unavailable", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    const { aiProvider } = await import("@/server/lib/ai/factory");

    vi.mocked(aiProvider.isAvailable).mockReturnValue(false);

    vi.mocked(prisma.idea.findUnique).mockResolvedValue({
      id: "idea-1",
      title: "Smart Energy Monitor",
      teaser: "Monitor energy usage",
      description: "A device that monitors energy",
      tags: ["energy", "iot"],
      category: "Green Tech",
      campaignId: "camp-1",
    } as unknown as Awaited<ReturnType<typeof prisma.idea.findUnique>>);

    vi.mocked(prisma.idea.findMany).mockResolvedValue([
      {
        id: "idea-2",
        title: "Solar Panel Optimizer",
        teaser: "Optimize solar panels",
        status: "COMMUNITY_DISCUSSION",
        campaignId: "camp-1",
        campaign: { title: "Green Innovation" },
        contributor: { id: "user-1", name: "Alice" },
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.idea.findMany>>);

    const results = await findSimilarIdeas({ ideaId: "idea-1", limit: 5 });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("idea-2");
    expect(results[0].title).toBe("Solar Panel Optimizer");
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].campaignTitle).toBe("Green Innovation");
  });

  it("uses vector search when AI is available", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    const { aiProvider } = await import("@/server/lib/ai/factory");

    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);

    vi.mocked(prisma.idea.findUnique).mockResolvedValue({
      id: "idea-1",
      title: "Test Idea",
      teaser: null,
      description: null,
      tags: [],
      category: null,
      campaignId: "camp-1",
    } as unknown as Awaited<ReturnType<typeof prisma.idea.findUnique>>);

    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
      {
        id: "idea-2",
        title: "Similar Idea",
        teaser: "Very similar",
        status: "HOT",
        distance: 0.15,
        campaign_id: "camp-1",
        campaign_title: "Test Campaign",
        contributor_id: "user-1",
        contributor_name: "Bob",
      },
    ]);

    const results = await findSimilarIdeas({ ideaId: "idea-1", limit: 5 });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("idea-2");
    expect(results[0].score).toBe(0.85);
    expect(results[0].campaignTitle).toBe("Test Campaign");
  });

  it("falls back to text when vector search returns empty", async () => {
    const { prisma } = await import("@/server/lib/prisma");
    const { aiProvider } = await import("@/server/lib/ai/factory");

    vi.mocked(aiProvider.isAvailable).mockReturnValue(true);

    vi.mocked(prisma.idea.findUnique).mockResolvedValue({
      id: "idea-1",
      title: "Innovation Test",
      teaser: null,
      description: null,
      tags: ["testing"],
      category: null,
      campaignId: "camp-1",
    } as unknown as Awaited<ReturnType<typeof prisma.idea.findUnique>>);

    // Vector search returns empty (no embeddings yet)
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([]);

    // Text fallback returns results
    vi.mocked(prisma.idea.findMany).mockResolvedValue([
      {
        id: "idea-3",
        title: "Test Automation",
        teaser: "Automate tests",
        status: "DRAFT",
        campaignId: "camp-2",
        campaign: { title: "Automation Campaign" },
        contributor: { id: "user-2", name: "Charlie" },
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.idea.findMany>>);

    const results = await findSimilarIdeas({ ideaId: "idea-1", limit: 5 });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("idea-3");
  });
});
