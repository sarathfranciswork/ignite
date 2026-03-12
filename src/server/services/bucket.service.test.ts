import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listBuckets,
  getBucketById,
  createBucket,
  updateBucket,
  deleteBucket,
  reorderBuckets,
  assignIdeaToBucket,
  unassignIdeaFromBucket,
  listBucketIdeas,
  getBucketSidebar,
  BucketServiceError,
} from "./bucket.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    bucket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    ideaBucketAssignment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");

const mockBucket = {
  id: "bucket_1",
  campaignId: "campaign_1",
  name: "Top Ideas",
  color: "#6366F1",
  type: "MANUAL" as const,
  description: "Best ideas",
  sortOrder: 0,
  filterCriteria: null,
  createdById: "user_1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { assignments: 5 },
};

const mockSmartBucket = {
  ...mockBucket,
  id: "bucket_smart",
  name: "Hot Ideas",
  type: "SMART" as const,
  filterCriteria: { status: "HOT", minLikes: 5 },
};

describe("bucket.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listBuckets", () => {
    it("lists buckets for a campaign", async () => {
      vi.mocked(prisma.bucket.findMany).mockResolvedValue([mockBucket]);

      const result = await listBuckets({ campaignId: "campaign_1", limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Top Ideas");
      expect(result.items[0].ideaCount).toBe(5);
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by type", async () => {
      vi.mocked(prisma.bucket.findMany).mockResolvedValue([]);

      await listBuckets({ campaignId: "campaign_1", limit: 20, type: "SMART" });

      expect(prisma.bucket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campaignId: "campaign_1", type: "SMART" },
        }),
      );
    });

    it("returns next cursor when more items exist", async () => {
      const buckets = [mockBucket, { ...mockBucket, id: "bucket_2" }];
      vi.mocked(prisma.bucket.findMany).mockResolvedValue(buckets);

      const result = await listBuckets({ campaignId: "campaign_1", limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe("bucket_2");
    });
  });

  describe("getBucketById", () => {
    it("returns bucket with idea count", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue(mockBucket);

      const result = await getBucketById("bucket_1");

      expect(result.id).toBe("bucket_1");
      expect(result.ideaCount).toBe(5);
    });

    it("throws BUCKET_NOT_FOUND when bucket does not exist", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue(null);

      await expect(getBucketById("missing")).rejects.toThrow(BucketServiceError);
      await expect(getBucketById("missing")).rejects.toThrow("Bucket not found");
    });
  });

  describe("createBucket", () => {
    it("creates a manual bucket", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "campaign_1" } as never);
      vi.mocked(prisma.bucket.count).mockResolvedValue(0);
      vi.mocked(prisma.bucket.create).mockResolvedValue(mockBucket);

      const result = await createBucket(
        { campaignId: "campaign_1", name: "Top Ideas", color: "#6366F1", type: "MANUAL" },
        "user_1",
      );

      expect(result.name).toBe("Top Ideas");
      expect(prisma.bucket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            campaignId: "campaign_1",
            name: "Top Ideas",
            type: "MANUAL",
            createdById: "user_1",
          }),
        }),
      );
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      await expect(
        createBucket(
          { campaignId: "missing", name: "Test", color: "#6366F1", type: "MANUAL" },
          "user_1",
        ),
      ).rejects.toThrow("Campaign not found");
    });

    it("throws MISSING_FILTER_CRITERIA for smart bucket without filters", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "campaign_1" } as never);

      await expect(
        createBucket(
          { campaignId: "campaign_1", name: "Smart", color: "#6366F1", type: "SMART" },
          "user_1",
        ),
      ).rejects.toThrow("Smart buckets require filter criteria");
    });

    it("creates a smart bucket with filter criteria", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "campaign_1" } as never);
      vi.mocked(prisma.bucket.count).mockResolvedValue(1);
      vi.mocked(prisma.bucket.create).mockResolvedValue(mockSmartBucket);

      const result = await createBucket(
        {
          campaignId: "campaign_1",
          name: "Hot Ideas",
          color: "#6366F1",
          type: "SMART",
          filterCriteria: { status: "HOT", minLikes: 5 },
        },
        "user_1",
      );

      expect(result.type).toBe("SMART");
    });
  });

  describe("updateBucket", () => {
    it("updates bucket name and color", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_1",
        type: "MANUAL",
        campaignId: "campaign_1",
      } as never);
      const updated = { ...mockBucket, name: "Renamed" };
      vi.mocked(prisma.bucket.update).mockResolvedValue(updated);

      const result = await updateBucket({ id: "bucket_1", name: "Renamed" }, "user_1");

      expect(result.name).toBe("Renamed");
    });

    it("throws BUCKET_NOT_FOUND when bucket does not exist", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue(null);

      await expect(updateBucket({ id: "missing" }, "user_1")).rejects.toThrow("Bucket not found");
    });
  });

  describe("deleteBucket", () => {
    it("deletes a bucket", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_1",
        campaignId: "campaign_1",
        name: "Test",
      } as never);
      vi.mocked(prisma.bucket.delete).mockResolvedValue(mockBucket);

      const result = await deleteBucket("bucket_1", "user_1");

      expect(result.success).toBe(true);
      expect(prisma.bucket.delete).toHaveBeenCalledWith({ where: { id: "bucket_1" } });
    });

    it("throws BUCKET_NOT_FOUND when bucket does not exist", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue(null);

      await expect(deleteBucket("missing", "user_1")).rejects.toThrow("Bucket not found");
    });
  });

  describe("reorderBuckets", () => {
    it("reorders buckets via transaction", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      const result = await reorderBuckets(
        { campaignId: "campaign_1", bucketIds: ["b1", "b2", "b3"] },
        "user_1",
      );

      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("assignIdeaToBucket", () => {
    it("assigns an idea to a manual bucket", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_1",
        type: "MANUAL",
        campaignId: "campaign_1",
      } as never);
      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea_1",
        campaignId: "campaign_1",
      } as never);
      vi.mocked(prisma.ideaBucketAssignment.aggregate).mockResolvedValue({
        _max: { sortOrder: 2 },
      } as never);
      vi.mocked(prisma.ideaBucketAssignment.create).mockResolvedValue({
        id: "assign_1",
        bucketId: "bucket_1",
        ideaId: "idea_1",
        sortOrder: 3,
        addedAt: new Date("2026-01-01"),
      });

      const result = await assignIdeaToBucket({ bucketId: "bucket_1", ideaId: "idea_1" }, "user_1");

      expect(result.bucketId).toBe("bucket_1");
      expect(result.ideaId).toBe("idea_1");
      expect(result.sortOrder).toBe(3);
    });

    it("rejects assignment to smart bucket", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_smart",
        type: "SMART",
        campaignId: "campaign_1",
      } as never);

      await expect(
        assignIdeaToBucket({ bucketId: "bucket_smart", ideaId: "idea_1" }, "user_1"),
      ).rejects.toThrow("Cannot manually assign ideas to smart buckets");
    });

    it("rejects assignment when campaign mismatch", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_1",
        type: "MANUAL",
        campaignId: "campaign_1",
      } as never);
      vi.mocked(prisma.idea.findUnique).mockResolvedValue({
        id: "idea_1",
        campaignId: "campaign_2",
      } as never);

      await expect(
        assignIdeaToBucket({ bucketId: "bucket_1", ideaId: "idea_1" }, "user_1"),
      ).rejects.toThrow("same campaign");
    });

    it("throws BUCKET_NOT_FOUND when bucket does not exist", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue(null);

      await expect(
        assignIdeaToBucket({ bucketId: "missing", ideaId: "idea_1" }, "user_1"),
      ).rejects.toThrow("Bucket not found");
    });

    it("throws IDEA_NOT_FOUND when idea does not exist", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_1",
        type: "MANUAL",
        campaignId: "campaign_1",
      } as never);
      vi.mocked(prisma.idea.findUnique).mockResolvedValue(null);

      await expect(
        assignIdeaToBucket({ bucketId: "bucket_1", ideaId: "missing" }, "user_1"),
      ).rejects.toThrow("Idea not found");
    });
  });

  describe("unassignIdeaFromBucket", () => {
    it("unassigns an idea from a manual bucket", async () => {
      vi.mocked(prisma.ideaBucketAssignment.findUnique).mockResolvedValue({
        id: "assign_1",
        bucket: { type: "MANUAL", campaignId: "campaign_1" },
      } as never);
      vi.mocked(prisma.ideaBucketAssignment.delete).mockResolvedValue({} as never);

      const result = await unassignIdeaFromBucket(
        { bucketId: "bucket_1", ideaId: "idea_1" },
        "user_1",
      );

      expect(result.success).toBe(true);
    });

    it("rejects unassignment from smart bucket", async () => {
      vi.mocked(prisma.ideaBucketAssignment.findUnique).mockResolvedValue({
        id: "assign_1",
        bucket: { type: "SMART", campaignId: "campaign_1" },
      } as never);

      await expect(
        unassignIdeaFromBucket({ bucketId: "bucket_smart", ideaId: "idea_1" }, "user_1"),
      ).rejects.toThrow("Cannot manually unassign ideas from smart buckets");
    });

    it("throws ASSIGNMENT_NOT_FOUND when not assigned", async () => {
      vi.mocked(prisma.ideaBucketAssignment.findUnique).mockResolvedValue(null);

      await expect(
        unassignIdeaFromBucket({ bucketId: "bucket_1", ideaId: "idea_1" }, "user_1"),
      ).rejects.toThrow("not assigned");
    });
  });

  describe("listBucketIdeas", () => {
    it("lists ideas in a manual bucket", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_1",
        type: "MANUAL",
        campaignId: "campaign_1",
        filterCriteria: null,
      } as never);

      const mockAssignment = {
        id: "assign_1",
        sortOrder: 0,
        addedAt: new Date("2026-01-01"),
        idea: {
          id: "idea_1",
          title: "Test Idea",
          teaser: null,
          status: "COMMUNITY_DISCUSSION",
          category: null,
          tags: [],
          likesCount: 3,
          commentsCount: 1,
          viewsCount: 10,
          createdAt: new Date("2026-01-01"),
          contributor: { id: "user_1", name: "User", email: "u@e.com", image: null },
        },
      };
      vi.mocked(prisma.ideaBucketAssignment.findMany).mockResolvedValue([mockAssignment]);

      const result = await listBucketIdeas({ bucketId: "bucket_1", limit: 25 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].idea.title).toBe("Test Idea");
    });

    it("evaluates smart bucket filters on access", async () => {
      vi.mocked(prisma.bucket.findUnique).mockResolvedValue({
        id: "bucket_smart",
        type: "SMART",
        campaignId: "campaign_1",
        filterCriteria: { status: "HOT", minLikes: 5 },
      } as never);

      const mockIdea = {
        id: "idea_hot",
        title: "Hot Idea",
        teaser: null,
        status: "HOT",
        category: null,
        tags: [],
        likesCount: 10,
        commentsCount: 5,
        viewsCount: 100,
        createdAt: new Date("2026-01-01"),
        contributor: { id: "user_1", name: "User", email: "u@e.com", image: null },
      };
      vi.mocked(prisma.idea.findMany).mockResolvedValue([mockIdea]);

      const result = await listBucketIdeas({ bucketId: "bucket_smart", limit: 25 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].idea.title).toBe("Hot Idea");
      expect(prisma.idea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId: "campaign_1",
            status: "HOT",
            likesCount: { gte: 5 },
          }),
        }),
      );
    });
  });

  describe("getBucketSidebar", () => {
    it("returns buckets with correct counts", async () => {
      vi.mocked(prisma.bucket.findMany).mockResolvedValue([mockBucket, mockSmartBucket]);
      vi.mocked(prisma.idea.count).mockResolvedValue(8);

      const result = await getBucketSidebar({ campaignId: "campaign_1" });

      expect(result).toHaveLength(2);
      expect(result[0].ideaCount).toBe(5); // manual bucket uses _count
      expect(result[1].ideaCount).toBe(8); // smart bucket uses dynamic count
    });
  });
});
