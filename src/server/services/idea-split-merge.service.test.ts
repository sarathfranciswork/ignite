import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  splitIdea,
  mergeIdeas,
  getMergeHistory,
  bulkAssignBucket,
  bulkArchiveIdeas,
  bulkExportIdeas,
} from "./idea-split-merge.service";
import { IdeaServiceError } from "./idea.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ideaCoAuthor: {
      createMany: vi.fn(),
    },
    ideaFollow: {
      upsert: vi.fn(),
    },
    ideaMergeHistory: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    ideaBucketAssignment: {
      createMany: vi.fn(),
    },
    bucket: {
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
const { eventBus } = await import("@/server/events/event-bus");

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const ideaFindMany = prisma.idea.findMany as unknown as Mock;
const bucketFindUnique = prisma.bucket.findUnique as unknown as Mock;
const mergeHistoryFindMany = prisma.ideaMergeHistory.findMany as unknown as Mock;
const bucketAssignmentCreateMany = prisma.ideaBucketAssignment.createMany as unknown as Mock;
const mockTransaction = prisma.$transaction as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockContributor = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  image: null,
};

const mockCampaign = {
  id: "campaign-1",
  title: "Test Campaign",
  status: "SUBMISSION" as const,
};

function createMockIdea(overrides: Record<string, unknown> = {}) {
  return {
    id: "idea-1",
    title: "Original Idea",
    teaser: "A teaser",
    description: "A description",
    status: "COMMUNITY_DISCUSSION",
    previousStatus: null,
    campaignId: "campaign-1",
    contributorId: "user-1",
    category: "tech",
    tags: ["ai", "ml"],
    customFieldValues: null,
    attachments: null,
    isConfidential: false,
    inventionDisclosure: false,
    likesCount: 5,
    commentsCount: 3,
    viewsCount: 100,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    contributor: mockContributor,
    coAuthors: [],
    campaign: mockCampaign,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("splitIdea", () => {
  it("should throw IDEA_NOT_FOUND when idea does not exist", async () => {
    ideaFindUnique.mockResolvedValue(null);

    await expect(
      splitIdea(
        {
          id: "nonexistent",
          newIdeas: [{ title: "Part 1" }, { title: "Part 2" }],
        },
        "actor-1",
      ),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should split an idea into multiple new ideas", async () => {
    const original = createMockIdea({
      coAuthors: [{ userId: "co-1" }],
    });

    ideaFindUnique.mockResolvedValue(original);

    const newIdea1 = createMockIdea({ id: "idea-new-1", title: "Part 1" });
    const newIdea2 = createMockIdea({ id: "idea-new-2", title: "Part 2" });
    const archivedOriginal = createMockIdea({
      status: "ARCHIVED",
      previousStatus: "COMMUNITY_DISCUSSION",
    });

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        idea: {
          create: vi.fn().mockResolvedValueOnce(newIdea1).mockResolvedValueOnce(newIdea2),
          update: vi.fn().mockResolvedValue(archivedOriginal),
        },
        ideaCoAuthor: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return cb(tx);
    });

    const result = await splitIdea(
      {
        id: "idea-1",
        newIdeas: [
          { title: "Part 1", description: "Part 1 desc" },
          { title: "Part 2", description: "Part 2 desc" },
        ],
      },
      "actor-1",
    );

    expect(result.original.status).toBe("ARCHIVED");
    expect(result.newIdeas).toHaveLength(2);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.split",
      expect.objectContaining({
        entity: "idea",
        entityId: "idea-1",
        actor: "actor-1",
      }),
    );
  });
});

describe("mergeIdeas", () => {
  it("should throw IDEA_NOT_FOUND when target does not exist", async () => {
    ideaFindUnique.mockResolvedValue(null);

    await expect(
      mergeIdeas({ targetIdeaId: "nonexistent", sourceIdeaIds: ["src-1"] }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should throw INVALID_MERGE_TARGET when target is in source list", async () => {
    const target = createMockIdea({ id: "target-1" });
    ideaFindUnique.mockResolvedValue(target);

    await expect(
      mergeIdeas({ targetIdeaId: "target-1", sourceIdeaIds: ["target-1", "src-1"] }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should throw IDEA_NOT_FOUND when source ideas count mismatch", async () => {
    const target = createMockIdea({ id: "target-1" });
    ideaFindUnique.mockResolvedValue(target);
    ideaFindMany.mockResolvedValue([createMockIdea({ id: "src-1" })]);

    await expect(
      mergeIdeas({ targetIdeaId: "target-1", sourceIdeaIds: ["src-1", "src-missing"] }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should throw CAMPAIGN_MISMATCH when ideas are from different campaigns", async () => {
    const target = createMockIdea({ id: "target-1", campaignId: "campaign-1" });
    ideaFindUnique.mockResolvedValue(target);
    ideaFindMany.mockResolvedValue([
      createMockIdea({
        id: "src-1",
        campaignId: "campaign-2",
        comments: [],
        likes: [],
        votes: [],
        followers: [],
      }),
    ]);

    await expect(
      mergeIdeas({ targetIdeaId: "target-1", sourceIdeaIds: ["src-1"] }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should merge source ideas into target", async () => {
    const target = createMockIdea({
      id: "target-1",
      campaign: mockCampaign,
    });
    ideaFindUnique.mockResolvedValue(target);

    const source = createMockIdea({
      id: "src-1",
      campaignId: "campaign-1",
      contributorId: "user-2",
      coAuthors: [{ userId: "co-2" }],
      comments: [{ id: "c-1" }],
      likes: [{ userId: "u-3" }],
      votes: [],
      followers: [{ userId: "u-4" }],
    });
    ideaFindMany.mockResolvedValue([source]);

    const mergedTarget = createMockIdea({ id: "target-1", likesCount: 6, commentsCount: 4 });

    mockTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        ideaMergeHistory: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        ideaCoAuthor: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        ideaFollow: { upsert: vi.fn().mockResolvedValue({}) },
        idea: {
          update: vi.fn().mockResolvedValue(mergedTarget),
          findUnique: vi.fn().mockResolvedValue(mergedTarget),
        },
      };
      return cb(tx);
    });

    const result = await mergeIdeas(
      { targetIdeaId: "target-1", sourceIdeaIds: ["src-1"] },
      "actor-1",
    );

    expect(result.id).toBe("target-1");
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.merged",
      expect.objectContaining({
        entity: "idea",
        entityId: "target-1",
        actor: "actor-1",
      }),
    );
  });
});

describe("getMergeHistory", () => {
  it("should return merge history for an idea", async () => {
    mergeHistoryFindMany.mockResolvedValue([
      {
        id: "mh-1",
        targetIdeaId: "target-1",
        sourceIdeaId: "src-1",
        mergedById: "actor-1",
        sourceTitle: "Source Idea",
        sourceTeaser: "Teaser",
        mergedAt: new Date("2026-01-01"),
      },
    ]);

    const result = await getMergeHistory("target-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.sourceTitle).toBe("Source Idea");
    expect(result[0]!.mergedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("bulkAssignBucket", () => {
  it("should throw BUCKET_NOT_FOUND when bucket does not exist", async () => {
    bucketFindUnique.mockResolvedValue(null);

    await expect(
      bulkAssignBucket({ ideaIds: ["idea-1"], bucketId: "nonexistent" }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should throw CAMPAIGN_MISMATCH when ideas and bucket are from different campaigns", async () => {
    bucketFindUnique.mockResolvedValue({
      id: "bucket-1",
      name: "My Bucket",
      campaignId: "campaign-1",
    });
    ideaFindMany.mockResolvedValue([{ id: "idea-1", campaignId: "campaign-2" }]);

    await expect(
      bulkAssignBucket({ ideaIds: ["idea-1"], bucketId: "bucket-1" }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should assign ideas to bucket", async () => {
    bucketFindUnique.mockResolvedValue({
      id: "bucket-1",
      name: "My Bucket",
      campaignId: "campaign-1",
    });
    ideaFindMany.mockResolvedValue([
      { id: "idea-1", campaignId: "campaign-1" },
      { id: "idea-2", campaignId: "campaign-1" },
    ]);
    bucketAssignmentCreateMany.mockResolvedValue({ count: 2 });

    const result = await bulkAssignBucket(
      { ideaIds: ["idea-1", "idea-2"], bucketId: "bucket-1" },
      "actor-1",
    );

    expect(result.assignedCount).toBe(2);
    expect(result.bucketId).toBe("bucket-1");
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.bulkBucketAssigned",
      expect.objectContaining({ entity: "idea" }),
    );
  });
});

describe("bulkArchiveIdeas", () => {
  it("should throw IDEA_NOT_FOUND when some ideas are missing", async () => {
    ideaFindMany.mockResolvedValue([{ id: "idea-1", status: "DRAFT", campaignId: "c1" }]);

    await expect(
      bulkArchiveIdeas({ ideaIds: ["idea-1", "idea-missing"], reason: "Cleanup" }, "actor-1"),
    ).rejects.toThrow(IdeaServiceError);
  });

  it("should archive multiple ideas and skip already-archived ones", async () => {
    ideaFindMany.mockResolvedValue([
      { id: "idea-1", status: "COMMUNITY_DISCUSSION", campaignId: "c1" },
      { id: "idea-2", status: "ARCHIVED", campaignId: "c1" },
    ]);
    mockTransaction.mockResolvedValue([{}]);

    const result = await bulkArchiveIdeas(
      { ideaIds: ["idea-1", "idea-2"], reason: "Cleanup" },
      "actor-1",
    );

    expect(result.archivedCount).toBe(1);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.bulkArchived",
      expect.objectContaining({ entity: "idea" }),
    );
  });

  it("should return 0 when all ideas are already archived", async () => {
    ideaFindMany.mockResolvedValue([{ id: "idea-1", status: "ARCHIVED", campaignId: "c1" }]);

    const result = await bulkArchiveIdeas({ ideaIds: ["idea-1"], reason: "Cleanup" }, "actor-1");

    expect(result.archivedCount).toBe(0);
  });
});

describe("bulkExportIdeas", () => {
  it("should export ideas as structured data", async () => {
    ideaFindMany.mockResolvedValue([
      {
        id: "idea-1",
        title: "Test Idea",
        teaser: "Teaser",
        description: "Description",
        status: "COMMUNITY_DISCUSSION",
        category: "tech",
        tags: ["ai"],
        likesCount: 5,
        commentsCount: 3,
        viewsCount: 100,
        isConfidential: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        contributor: { id: "user-1", name: "Test User", email: "test@example.com" },
        coAuthors: [],
        campaign: { id: "campaign-1", title: "Test Campaign" },
      },
    ]);

    const result = await bulkExportIdeas(
      { ideaIds: ["idea-1"], campaignId: "campaign-1" },
      "actor-1",
    );

    expect(result.ideas).toHaveLength(1);
    expect(result.ideas[0]!.title).toBe("Test Idea");
    expect(result.ideas[0]!.contributorName).toBe("Test User");
    expect(result.exportedAt).toBeDefined();
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.bulkExported",
      expect.objectContaining({ entity: "idea" }),
    );
  });
});
