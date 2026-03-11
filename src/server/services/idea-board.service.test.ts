import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { listIdeasForBoard } from "./idea.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ideaCoAuthor: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
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

const ideaFindMany = prisma.idea.findMany as unknown as Mock;

const mockContributor = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

function makeMockIdea(
  overrides: Partial<{
    id: string;
    title: string;
    status: string;
    category: string | null;
    tags: string[];
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? "idea-1",
    title: overrides.title ?? "Test Idea",
    teaser: "A teaser",
    description: "A description",
    status: overrides.status ?? "COMMUNITY_DISCUSSION",
    previousStatus: null,
    campaignId: "campaign-1",
    contributorId: "user-1",
    category: overrides.category ?? "Tech",
    tags: overrides.tags ?? ["ai"],
    customFieldValues: null,
    attachments: null,
    isConfidential: false,
    inventionDisclosure: false,
    likesCount: overrides.likesCount ?? 5,
    commentsCount: overrides.commentsCount ?? 3,
    viewsCount: overrides.viewsCount ?? 10,
    submittedAt: new Date("2026-01-15T00:00:00Z"),
    createdAt: overrides.createdAt ?? new Date("2026-01-10T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-12T00:00:00Z"),
    contributor: mockContributor,
    coAuthors: [],
  };
}

describe("listIdeasForBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated ideas with default sort (createdAt desc)", async () => {
    const mockIdeas = [makeMockIdea({ id: "idea-1" }), makeMockIdea({ id: "idea-2" })];
    ideaFindMany.mockResolvedValue(mockIdeas);

    const result = await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeUndefined();
    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "campaign-1" },
        take: 26,
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("applies status filter when provided", async () => {
    ideaFindMany.mockResolvedValue([]);

    await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      status: "HOT",
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "campaign-1", status: "HOT" },
      }),
    );
  });

  it("applies tag filter when provided", async () => {
    ideaFindMany.mockResolvedValue([]);

    await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      tag: "ai",
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "campaign-1", tags: { has: "ai" } },
      }),
    );
  });

  it("applies category filter when provided", async () => {
    ideaFindMany.mockResolvedValue([]);

    await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      category: "Tech",
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "campaign-1", category: "Tech" },
      }),
    );
  });

  it("applies search filter when provided", async () => {
    ideaFindMany.mockResolvedValue([]);

    await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      search: "machine learning",
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          campaignId: "campaign-1",
          OR: [
            { title: { contains: "machine learning", mode: "insensitive" } },
            { teaser: { contains: "machine learning", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("sorts by likesCount ascending", async () => {
    ideaFindMany.mockResolvedValue([]);

    await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      sortField: "likesCount",
      sortDirection: "asc",
    });

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { likesCount: "asc" },
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const mockIdeas = Array.from({ length: 26 }, (_, i) => makeMockIdea({ id: `idea-${i}` }));
    ideaFindMany.mockResolvedValue(mockIdeas);

    const result = await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(result.items).toHaveLength(25);
    expect(result.nextCursor).toBe("idea-25");
  });

  it("uses cursor for pagination when provided", async () => {
    ideaFindMany.mockResolvedValue([]);

    await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      cursor: "idea-10",
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1,
        cursor: { id: "idea-10" },
      }),
    );
  });

  it("serializes dates to ISO strings", async () => {
    const createdAt = new Date("2026-01-10T00:00:00Z");
    const updatedAt = new Date("2026-01-12T00:00:00Z");
    ideaFindMany.mockResolvedValue([makeMockIdea({ createdAt, updatedAt })]);

    const result = await listIdeasForBoard({
      campaignId: "campaign-1",
      limit: 25,
      sortField: "createdAt",
      sortDirection: "desc",
    });

    expect(result.items[0]?.createdAt).toBe(createdAt.toISOString());
    expect(result.items[0]?.updatedAt).toBe(updatedAt.toISOString());
  });
});
