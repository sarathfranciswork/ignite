import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  globalSearch,
  exploreList,
  listSavedSearches,
  createSavedSearch,
  deleteSavedSearch,
  SearchServiceError,
} from "./search.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: { findMany: vi.fn() },
    campaign: { findMany: vi.fn() },
    channel: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    savedSearch: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

describe("search.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("globalSearch", () => {
    it("searches across all entity types by default", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const results = await globalSearch({ query: "test", limit: 10 });

      expect(results).toEqual([]);
      expect(prisma.idea.findMany).toHaveBeenCalled();
      expect(prisma.campaign.findMany).toHaveBeenCalled();
      expect(prisma.channel.findMany).toHaveBeenCalled();
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it("searches only specified entity types", async () => {
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);

      await globalSearch({
        query: "test",
        entityTypes: ["campaign"],
        limit: 10,
      });

      expect(prisma.campaign.findMany).toHaveBeenCalled();
      expect(prisma.idea.findMany).not.toHaveBeenCalled();
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it("returns results from ideas with correct type", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([
        {
          id: "idea_1",
          title: "Test Idea",
          teaser: "A test idea",
          status: "DRAFT",
          likesCount: 5,
          commentsCount: 3,
          campaignId: "camp_1",
          contributor: { id: "user_1", name: "User One" },
        } as never,
      ]);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const results = await globalSearch({ query: "test", limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("idea");
      expect(results[0].title).toBe("Test Idea");
      expect(results[0].url).toBe("/campaigns/camp_1/ideas/idea_1");
    });

    it("returns results from campaigns", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([
        {
          id: "camp_1",
          title: "Test Campaign",
          teaser: "A campaign",
          status: "SUBMISSION",
          createdBy: { id: "user_1", name: "User" },
          _count: { ideas: 10, members: 5 },
        } as never,
      ]);
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const results = await globalSearch({ query: "test", limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("campaign");
      expect(results[0].url).toBe("/campaigns/camp_1");
    });

    it("returns results from users", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: "user_1",
          name: "John Doe",
          email: "john@example.com",
          image: null,
          bio: "Engineer",
          skills: ["TypeScript"],
        } as never,
      ]);

      const results = await globalSearch({ query: "john", limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe("user");
      expect(results[0].title).toBe("John Doe");
      expect(results[0].url).toBe("/profile/user_1");
    });

    it("limits total results to requested limit", async () => {
      const manyIdeas = Array.from({ length: 5 }, (_, i) => ({
        id: `idea_${i}`,
        title: `Idea ${i}`,
        teaser: null,
        status: "DRAFT",
        likesCount: 0,
        commentsCount: 0,
        campaignId: "camp_1",
        contributor: { id: "user_1", name: "User" },
      }));
      const manyCampaigns = Array.from({ length: 5 }, (_, i) => ({
        id: `camp_${i}`,
        title: `Campaign ${i}`,
        teaser: null,
        status: "DRAFT",
        createdBy: { id: "user_1", name: "User" },
        _count: { ideas: 0, members: 0 },
      }));

      vi.mocked(prisma.idea.findMany).mockResolvedValue(manyIdeas as never);
      vi.mocked(prisma.campaign.findMany).mockResolvedValue(manyCampaigns as never);
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const results = await globalSearch({ query: "test", limit: 3 });

      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("exploreList", () => {
    it("explores campaigns with cursor pagination", async () => {
      const mockCampaigns = [
        {
          id: "camp_1",
          title: "Campaign One",
          teaser: "First campaign",
          status: "SUBMISSION",
          bannerUrl: null,
          submissionType: "CALL_FOR_IDEAS",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
          createdBy: { id: "user_1", name: "User", email: "u@e.com", image: null },
          _count: { ideas: 3, members: 2 },
          submissionCloseDate: null,
        },
      ];

      vi.mocked(prisma.campaign.findMany).mockResolvedValue(mockCampaigns as never);

      const result = await exploreList({
        entityType: "campaign",
        limit: 20,
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Campaign One");
      expect(result.nextCursor).toBeUndefined();
    });

    it("explores ideas with search filter", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);

      await exploreList({
        entityType: "idea",
        limit: 20,
        search: "innovation",
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(prisma.idea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: "innovation", mode: "insensitive" } },
            ]),
          }),
        }),
      );
    });

    it("explores channels", async () => {
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);

      await exploreList({
        entityType: "channel",
        limit: 20,
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(prisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: "asc" },
        }),
      );
    });

    it("explores users", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      await exploreList({
        entityType: "user",
        limit: 20,
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { name: "asc" },
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `camp_${i}`,
        title: `Campaign ${i}`,
        teaser: null,
        status: "DRAFT",
        bannerUrl: null,
        submissionType: "CALL_FOR_IDEAS",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        createdBy: { id: "user_1", name: "User", email: "u@e.com", image: null },
        _count: { ideas: 0, members: 0 },
        submissionCloseDate: null,
      }));

      vi.mocked(prisma.campaign.findMany).mockResolvedValue(items as never);

      const result = await exploreList({
        entityType: "campaign",
        limit: 20,
        sortBy: "date",
        sortOrder: "desc",
      });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("camp_20");
    });
  });

  describe("savedSearches", () => {
    it("lists saved searches for a user", async () => {
      vi.mocked(prisma.savedSearch.findMany).mockResolvedValue([
        {
          id: "ss_1",
          name: "My Search",
          query: "innovation",
          filters: { entityType: "idea" },
          userId: "user_1",
          createdAt: new Date("2026-01-01"),
        },
      ]);

      const results = await listSavedSearches("user_1");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("My Search");
      expect(results[0].query).toBe("innovation");
    });

    it("creates a saved search", async () => {
      vi.mocked(prisma.savedSearch.create).mockResolvedValue({
        id: "ss_new",
        name: "New Search",
        query: "test query",
        filters: null,
        userId: "user_1",
        createdAt: new Date("2026-01-15"),
      });

      const result = await createSavedSearch({ name: "New Search", query: "test query" }, "user_1");

      expect(result.id).toBe("ss_new");
      expect(result.name).toBe("New Search");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "search.saved",
        expect.objectContaining({
          entity: "savedSearch",
          entityId: "ss_new",
          actor: "user_1",
        }),
      );
    });

    it("deletes a saved search owned by the user", async () => {
      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue({
        id: "ss_1",
        userId: "user_1",
      } as never);
      vi.mocked(prisma.savedSearch.delete).mockResolvedValue({} as never);

      const result = await deleteSavedSearch("ss_1", "user_1");

      expect(result.success).toBe(true);
      expect(eventBus.emit).toHaveBeenCalledWith(
        "search.deleted",
        expect.objectContaining({
          entity: "savedSearch",
          entityId: "ss_1",
          actor: "user_1",
        }),
      );
    });

    it("throws NOT_OWNER when deleting another user's search", async () => {
      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue({
        id: "ss_1",
        userId: "user_2",
      } as never);

      await expect(deleteSavedSearch("ss_1", "user_1")).rejects.toThrow(SearchServiceError);
      await expect(deleteSavedSearch("ss_1", "user_1")).rejects.toThrow(
        "You can only delete your own saved searches",
      );
    });

    it("throws SAVED_SEARCH_NOT_FOUND when search does not exist", async () => {
      vi.mocked(prisma.savedSearch.findUnique).mockResolvedValue(null);

      await expect(deleteSavedSearch("ss_missing", "user_1")).rejects.toThrow(SearchServiceError);
      await expect(deleteSavedSearch("ss_missing", "user_1")).rejects.toThrow(
        "Saved search not found",
      );
    });
  });
});
