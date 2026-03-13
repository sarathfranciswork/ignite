import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  configureGamification,
  getConfig,
  recordActivity,
  getLeaderboard,
  getUserScore,
  recalculateScores,
  resetScores,
  GamificationServiceError,
} from "./gamification.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
    },
    gamificationConfig: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    userScore: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    idea: {
      groupBy: vi.fn(),
    },
    comment: {
      groupBy: vi.fn(),
    },
    ideaLike: {
      groupBy: vi.fn(),
    },
    evaluationResponse: {
      groupBy: vi.fn(),
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

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const configUpsert = prisma.gamificationConfig.upsert as unknown as Mock;
const configFindUnique = prisma.gamificationConfig.findUnique as unknown as Mock;
const scoreUpsert = prisma.userScore.upsert as unknown as Mock;
const scoreFindMany = prisma.userScore.findMany as unknown as Mock;
const scoreFindUnique = prisma.userScore.findUnique as unknown as Mock;
const scoreCount = prisma.userScore.count as unknown as Mock;
const scoreDeleteMany = prisma.userScore.deleteMany as unknown as Mock;
const scoreCreate = prisma.userScore.create as unknown as Mock;
const ideaGroupBy = prisma.idea.groupBy as unknown as Mock;
const commentGroupBy = prisma.comment.groupBy as unknown as Mock;
const likeGroupBy = prisma.ideaLike.groupBy as unknown as Mock;
const evalGroupBy = prisma.evaluationResponse.groupBy as unknown as Mock;

const baseConfig = {
  id: "config-1",
  campaignId: "campaign-1",
  isActive: true,
  ideaWeight: 5,
  commentWeight: 3,
  likeWeight: 1,
  evaluationWeight: 4,
  showLeaderboard: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("configureGamification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates gamification config for a campaign", async () => {
    campaignFindUnique.mockResolvedValueOnce({ id: "campaign-1" });
    configUpsert.mockResolvedValueOnce(baseConfig);

    const result = await configureGamification({
      campaignId: "campaign-1",
      isActive: true,
      ideaWeight: 5,
      commentWeight: 3,
      likeWeight: 1,
      evaluationWeight: 4,
      showLeaderboard: true,
    });

    expect(result).toEqual(baseConfig);
    expect(configUpsert).toHaveBeenCalledOnce();
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValueOnce(null);

    await expect(configureGamification({ campaignId: "nonexistent" })).rejects.toThrow(
      GamificationServiceError,
    );
  });
});

describe("getConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns config when it exists", async () => {
    configFindUnique.mockResolvedValueOnce(baseConfig);

    const result = await getConfig({ campaignId: "campaign-1" });
    expect(result).toEqual(baseConfig);
  });

  it("returns null when no config exists", async () => {
    configFindUnique.mockResolvedValueOnce(null);

    const result = await getConfig({ campaignId: "campaign-1" });
    expect(result).toBeNull();
  });
});

describe("recordActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records activity and updates score when gamification is active", async () => {
    configFindUnique.mockResolvedValueOnce(baseConfig);
    const mockScore = {
      id: "score-1",
      userId: "user-1",
      campaignId: "campaign-1",
      totalScore: 5,
      ideasCount: 1,
      commentsCount: 0,
      likesCount: 0,
      evaluationsCount: 0,
      rank: null,
      updatedAt: new Date(),
    };
    scoreUpsert.mockResolvedValueOnce(mockScore);

    const result = await recordActivity({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "idea",
    });

    expect(result).toEqual(mockScore);
    expect(scoreUpsert).toHaveBeenCalledOnce();
  });

  it("returns null when gamification is not active", async () => {
    configFindUnique.mockResolvedValueOnce({ ...baseConfig, isActive: false });

    const result = await recordActivity({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "idea",
    });

    expect(result).toBeNull();
    expect(scoreUpsert).not.toHaveBeenCalled();
  });

  it("returns null when no config exists", async () => {
    configFindUnique.mockResolvedValueOnce(null);

    const result = await recordActivity({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "comment",
    });

    expect(result).toBeNull();
  });

  it("uses correct weight for each activity type", async () => {
    configFindUnique.mockResolvedValueOnce(baseConfig);
    scoreUpsert.mockResolvedValueOnce({
      id: "score-1",
      totalScore: 3,
      updatedAt: new Date(),
    });

    await recordActivity({
      userId: "user-1",
      campaignId: "campaign-1",
      activityType: "comment",
    });

    // Verify the upsert was called with commentWeight (3)
    const call = scoreUpsert.mock.calls[0][0] as {
      create: { totalScore: number };
      update: { totalScore: { increment: number } };
    };
    expect(call.create.totalScore).toBe(3); // commentWeight
    expect(call.update.totalScore).toEqual({ increment: 3 });
  });
});

describe("getLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ranked leaderboard", async () => {
    configFindUnique.mockResolvedValueOnce(baseConfig);
    scoreFindMany.mockResolvedValueOnce([
      {
        id: "s1",
        userId: "u1",
        campaignId: "campaign-1",
        totalScore: 20,
        ideasCount: 2,
        commentsCount: 3,
        likesCount: 1,
        evaluationsCount: 0,
        rank: null,
        updatedAt: new Date("2026-03-01T00:00:00Z"),
        user: { id: "u1", name: "Alice", email: "a@test.com", image: null },
      },
      {
        id: "s2",
        userId: "u2",
        campaignId: "campaign-1",
        totalScore: 15,
        ideasCount: 1,
        commentsCount: 2,
        likesCount: 2,
        evaluationsCount: 1,
        rank: null,
        updatedAt: new Date("2026-03-01T00:00:00Z"),
        user: { id: "u2", name: "Bob", email: "b@test.com", image: null },
      },
    ]);

    const result = await getLeaderboard({ campaignId: "campaign-1", limit: 25 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].rank).toBe(1);
    expect(result.items[1].rank).toBe(2);
    expect(result.showLeaderboard).toBe(true);
  });

  it("handles tied scores with dense ranking", async () => {
    configFindUnique.mockResolvedValueOnce(baseConfig);
    scoreFindMany.mockResolvedValueOnce([
      {
        id: "s1",
        userId: "u1",
        totalScore: 20,
        ideasCount: 0,
        commentsCount: 0,
        likesCount: 0,
        evaluationsCount: 0,
        rank: null,
        updatedAt: new Date(),
        user: { id: "u1", name: "A", email: "a@t.com", image: null },
      },
      {
        id: "s2",
        userId: "u2",
        totalScore: 20,
        ideasCount: 0,
        commentsCount: 0,
        likesCount: 0,
        evaluationsCount: 0,
        rank: null,
        updatedAt: new Date(),
        user: { id: "u2", name: "B", email: "b@t.com", image: null },
      },
      {
        id: "s3",
        userId: "u3",
        totalScore: 10,
        ideasCount: 0,
        commentsCount: 0,
        likesCount: 0,
        evaluationsCount: 0,
        rank: null,
        updatedAt: new Date(),
        user: { id: "u3", name: "C", email: "c@t.com", image: null },
      },
    ]);

    const result = await getLeaderboard({ campaignId: "campaign-1", limit: 25 });

    expect(result.items[0].rank).toBe(1);
    expect(result.items[1].rank).toBe(1); // tied
    expect(result.items[2].rank).toBe(2); // dense ranking
  });

  it("throws when config not found", async () => {
    configFindUnique.mockResolvedValueOnce(null);

    await expect(getLeaderboard({ campaignId: "nonexistent", limit: 25 })).rejects.toThrow(
      GamificationServiceError,
    );
  });
});

describe("getUserScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user score with rank", async () => {
    scoreFindUnique.mockResolvedValueOnce({
      id: "s1",
      userId: "user-1",
      campaignId: "campaign-1",
      totalScore: 20,
      ideasCount: 2,
      commentsCount: 3,
      likesCount: 1,
      evaluationsCount: 0,
      rank: null,
      updatedAt: new Date("2026-03-01T00:00:00Z"),
      user: { id: "user-1", name: "Test", email: "t@t.com", image: null },
    });
    scoreCount.mockResolvedValueOnce(2); // 2 users have higher scores

    const result = await getUserScore({ userId: "user-1", campaignId: "campaign-1" });

    expect(result).not.toBeNull();
    expect(result?.rank).toBe(3); // 2 above + 1
  });

  it("returns null when no score exists", async () => {
    scoreFindUnique.mockResolvedValueOnce(null);

    const result = await getUserScore({ userId: "user-1", campaignId: "campaign-1" });
    expect(result).toBeNull();
  });
});

describe("recalculateScores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recalculates scores from activity history", async () => {
    configFindUnique.mockResolvedValueOnce(baseConfig);
    ideaGroupBy.mockResolvedValueOnce([{ contributorId: "user-1", _count: { id: 2 } }]);
    commentGroupBy.mockResolvedValueOnce([{ authorId: "user-1", _count: { id: 3 } }]);
    likeGroupBy.mockResolvedValueOnce([{ userId: "user-1", _count: { id: 5 } }]);
    evalGroupBy.mockResolvedValueOnce([]);
    scoreDeleteMany.mockResolvedValueOnce({ count: 0 });
    scoreCreate.mockResolvedValueOnce({
      id: "s1",
      userId: "user-1",
      campaignId: "campaign-1",
      totalScore: 24,
      ideasCount: 2,
      commentsCount: 3,
      likesCount: 5,
      evaluationsCount: 0,
    });

    const result = await recalculateScores({ campaignId: "campaign-1" });

    expect(result.usersRecalculated).toBe(1);
    expect(scoreCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          ideasCount: 2,
          commentsCount: 3,
          likesCount: 5,
          evaluationsCount: 0,
          totalScore: 2 * 5 + 3 * 3 + 5 * 1 + 0 * 4, // = 24
        }),
      }),
    );
  });

  it("throws when config not found", async () => {
    configFindUnique.mockResolvedValueOnce(null);

    await expect(recalculateScores({ campaignId: "nonexistent" })).rejects.toThrow(
      GamificationServiceError,
    );
  });
});

describe("resetScores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes all scores for a campaign", async () => {
    scoreDeleteMany.mockResolvedValueOnce({ count: 5 });

    const result = await resetScores({ campaignId: "campaign-1" });

    expect(result.scoresDeleted).toBe(5);
    expect(scoreDeleteMany).toHaveBeenCalledWith({
      where: { campaignId: "campaign-1" },
    });
  });
});
