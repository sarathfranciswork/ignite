import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  toggleLike,
  getLikeStatus,
  upsertVote,
  deleteVote,
  getIdeaVotes,
  toggleFollow,
  getFollowStatus,
  EngagementServiceError,
} from "./engagement.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ideaLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    ideaVote: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    ideaFollow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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
const likeFindUnique = prisma.ideaLike.findUnique as unknown as Mock;
const voteFindUnique = prisma.ideaVote.findUnique as unknown as Mock;
const voteFindMany = prisma.ideaVote.findMany as unknown as Mock;
const voteUpsert = prisma.ideaVote.upsert as unknown as Mock;
const followFindUnique = prisma.ideaFollow.findUnique as unknown as Mock;
const mockTransaction = prisma.$transaction as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockIdea = {
  id: "idea-1",
  campaignId: "campaign-1",
  campaign: { hasLikes: true, hasVoting: true, votingCriteria: null },
  likesCount: 5,
};

const userId = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Like Tests ──────────────────────────────────────────────

describe("toggleLike", () => {
  it("creates a like when not already liked", async () => {
    ideaFindUnique.mockResolvedValueOnce(mockIdea);
    likeFindUnique.mockResolvedValueOnce(null);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        ideaLike: { create: vi.fn() },
        idea: { update: vi.fn() },
      });
    });
    // For getLikesCount after
    ideaFindUnique.mockResolvedValueOnce({ likesCount: 6 });

    const result = await toggleLike({ ideaId: "idea-1" }, userId);

    expect(result.liked).toBe(true);
    expect(result.likesCount).toBe(6);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.liked",
      expect.objectContaining({ entityId: "idea-1", actor: userId }),
    );
  });

  it("removes a like when already liked", async () => {
    ideaFindUnique.mockResolvedValueOnce(mockIdea);
    likeFindUnique.mockResolvedValueOnce({ id: "like-1" });
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      await fn({
        ideaLike: { delete: vi.fn() },
        idea: { update: vi.fn() },
      });
    });
    ideaFindUnique.mockResolvedValueOnce({ likesCount: 4 });

    const result = await toggleLike({ ideaId: "idea-1" }, userId);

    expect(result.liked).toBe(false);
    expect(result.likesCount).toBe(4);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.unliked",
      expect.objectContaining({ entityId: "idea-1" }),
    );
  });

  it("throws when idea not found", async () => {
    ideaFindUnique.mockResolvedValueOnce(null);

    await expect(toggleLike({ ideaId: "nope" }, userId)).rejects.toThrow(EngagementServiceError);
  });

  it("throws when likes are disabled", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...mockIdea,
      campaign: { hasLikes: false },
    });

    await expect(toggleLike({ ideaId: "idea-1" }, userId)).rejects.toThrow("Likes are disabled");
  });
});

describe("getLikeStatus", () => {
  it("returns liked true when like exists", async () => {
    likeFindUnique.mockResolvedValueOnce({ id: "like-1" });
    const result = await getLikeStatus("idea-1", userId);
    expect(result.liked).toBe(true);
  });

  it("returns liked false when no like", async () => {
    likeFindUnique.mockResolvedValueOnce(null);
    const result = await getLikeStatus("idea-1", userId);
    expect(result.liked).toBe(false);
  });
});

// ── Vote Tests ──────────────────────────────────────────────

describe("upsertVote", () => {
  it("creates a new vote and emits event", async () => {
    ideaFindUnique.mockResolvedValueOnce(mockIdea);
    voteFindUnique.mockResolvedValueOnce(null);
    const now = new Date();
    voteUpsert.mockResolvedValueOnce({
      id: "vote-1",
      ideaId: "idea-1",
      criterionId: "overall",
      score: 4,
      createdAt: now,
      updatedAt: now,
    });

    const result = await upsertVote(
      { ideaId: "idea-1", criterionId: "overall", score: 4 },
      userId,
    );

    expect(result.score).toBe(4);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.voted",
      expect.objectContaining({ entityId: "idea-1" }),
    );
  });

  it("updates existing vote without emitting new vote event", async () => {
    ideaFindUnique.mockResolvedValueOnce(mockIdea);
    voteFindUnique.mockResolvedValueOnce({ id: "vote-1" });
    const now = new Date();
    voteUpsert.mockResolvedValueOnce({
      id: "vote-1",
      ideaId: "idea-1",
      criterionId: "overall",
      score: 3,
      createdAt: now,
      updatedAt: now,
    });

    await upsertVote({ ideaId: "idea-1", criterionId: "overall", score: 3 }, userId);

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("throws when voting is disabled", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...mockIdea,
      campaign: { hasVoting: false, votingCriteria: null },
    });

    await expect(
      upsertVote({ ideaId: "idea-1", criterionId: "overall", score: 4 }, userId),
    ).rejects.toThrow("Voting is disabled");
  });

  it("validates criterion against campaign criteria", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...mockIdea,
      campaign: {
        hasVoting: true,
        votingCriteria: [
          { id: "innovation", label: "Innovation" },
          { id: "feasibility", label: "Feasibility" },
        ],
      },
    });

    await expect(
      upsertVote({ ideaId: "idea-1", criterionId: "invalid", score: 4 }, userId),
    ).rejects.toThrow("Invalid voting criterion");
  });
});

describe("deleteVote", () => {
  it("deletes an existing vote", async () => {
    voteFindUnique.mockResolvedValueOnce({ id: "vote-1" });
    const mockDelete = prisma.ideaVote.delete as unknown as Mock;
    mockDelete.mockResolvedValueOnce({});

    const result = await deleteVote({ ideaId: "idea-1", criterionId: "overall" }, userId);

    expect(result.ideaId).toBe("idea-1");
  });

  it("throws when vote not found", async () => {
    voteFindUnique.mockResolvedValueOnce(null);

    await expect(
      deleteVote({ ideaId: "idea-1", criterionId: "overall" }, userId),
    ).rejects.toThrow("Vote not found");
  });
});

describe("getIdeaVotes", () => {
  it("returns vote stats with default overall criterion", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      id: "idea-1",
      campaign: { hasVoting: true, votingCriteria: null },
    });
    voteFindMany
      .mockResolvedValueOnce([]) // user votes
      .mockResolvedValueOnce([
        { criterionId: "overall", score: 4 },
        { criterionId: "overall", score: 5 },
      ]) // all votes
      .mockResolvedValueOnce([{ userId: "user-a" }, { userId: "user-b" }]); // distinct voters

    const result = await getIdeaVotes({ ideaId: "idea-1" }, userId);

    expect(result.hasVoting).toBe(true);
    expect(result.criteria).toHaveLength(1);
    expect(result.criteria[0]?.criterionId).toBe("overall");
    expect(result.criteria[0]?.averageScore).toBe(4.5);
    expect(result.totalVoters).toBe(2);
  });
});

// ── Follow Tests ────────────────────────────────────────────

describe("toggleFollow", () => {
  it("creates a follow when not already following", async () => {
    ideaFindUnique.mockResolvedValueOnce({ id: "idea-1", campaignId: "campaign-1" });
    followFindUnique.mockResolvedValueOnce(null);
    const mockCreate = prisma.ideaFollow.create as unknown as Mock;
    mockCreate.mockResolvedValueOnce({ id: "follow-1" });

    const result = await toggleFollow({ ideaId: "idea-1" }, userId);

    expect(result.following).toBe(true);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.followed",
      expect.objectContaining({ entityId: "idea-1" }),
    );
  });

  it("removes a follow when already following", async () => {
    ideaFindUnique.mockResolvedValueOnce({ id: "idea-1", campaignId: "campaign-1" });
    followFindUnique.mockResolvedValueOnce({ id: "follow-1" });
    const mockDelete = prisma.ideaFollow.delete as unknown as Mock;
    mockDelete.mockResolvedValueOnce({});

    const result = await toggleFollow({ ideaId: "idea-1" }, userId);

    expect(result.following).toBe(false);
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.unfollowed",
      expect.objectContaining({ entityId: "idea-1" }),
    );
  });

  it("throws when idea not found", async () => {
    ideaFindUnique.mockResolvedValueOnce(null);

    await expect(toggleFollow({ ideaId: "nope" }, userId)).rejects.toThrow("Idea not found");
  });
});

describe("getFollowStatus", () => {
  it("returns following true when follow exists", async () => {
    followFindUnique.mockResolvedValueOnce({ id: "follow-1" });
    const result = await getFollowStatus("idea-1", userId);
    expect(result.following).toBe(true);
  });

  it("returns following false when not following", async () => {
    followFindUnique.mockResolvedValueOnce(null);
    const result = await getFollowStatus("idea-1", userId);
    expect(result.following).toBe(false);
  });
});
