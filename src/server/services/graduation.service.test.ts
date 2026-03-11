import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getGraduationProgress,
  checkAndGraduateIdea,
  GraduationServiceError,
} from "./graduation.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
    },
    ideaVote: {
      findMany: vi.fn(),
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

const mockTransitionIdea = vi.fn();
vi.mock("@/server/services/idea.service", () => ({
  transitionIdea: (...args: unknown[]) => mockTransitionIdea(...args),
}));

const { prisma } = await import("@/server/lib/prisma");

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const commentFindMany = prisma.comment.findMany as unknown as Mock;
const voteFindMany = prisma.ideaVote.findMany as unknown as Mock;

const baseCampaign = {
  hasCommunityGraduation: true,
  hasDiscussionPhase: true,
  hasQualificationPhase: false,
  graduationVisitors: 10,
  graduationCommenters: 5,
  graduationLikes: 3,
  graduationVoters: 2,
  graduationVotingLevel: 3.0,
  graduationDaysInStatus: 0,
  status: "DISCUSSION_VOTING",
};

const baseIdea = {
  id: "idea-1",
  status: "COMMUNITY_DISCUSSION",
  likesCount: 15,
  viewsCount: 20,
  campaignId: "campaign-1",
  title: "Test Idea",
  updatedAt: new Date("2026-01-01"),
  campaign: baseCampaign,
};

describe("getGraduationProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns progress with all thresholds met", async () => {
    ideaFindUnique.mockResolvedValueOnce(baseIdea);
    commentFindMany.mockResolvedValueOnce([
      { authorId: "u1" },
      { authorId: "u2" },
      { authorId: "u3" },
      { authorId: "u4" },
      { authorId: "u5" },
    ]);
    voteFindMany
      .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }])
      .mockResolvedValueOnce([{ score: 4 }, { score: 3 }, { score: 5 }]);

    const result = await getGraduationProgress("idea-1");

    expect(result.eligible).toBe(true);
    expect(result.thresholds.visitors.met).toBe(true);
    expect(result.thresholds.commenters.met).toBe(true);
    expect(result.thresholds.likes.met).toBe(true);
    expect(result.thresholds.voters.met).toBe(true);
    expect(result.thresholds.votingLevel.met).toBe(true);
  });

  it("returns ineligible for non-COMMUNITY_DISCUSSION ideas", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      status: "QUALIFICATION",
    });
    commentFindMany.mockResolvedValueOnce([]);
    voteFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await getGraduationProgress("idea-1");

    expect(result.eligible).toBe(false);
  });

  it("returns ineligible when community graduation is disabled", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      campaign: { ...baseCampaign, hasCommunityGraduation: false },
    });
    commentFindMany.mockResolvedValueOnce([]);
    voteFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await getGraduationProgress("idea-1");

    expect(result.eligible).toBe(false);
  });

  it("throws IDEA_NOT_FOUND for missing idea", async () => {
    ideaFindUnique.mockResolvedValueOnce(null);

    await expect(getGraduationProgress("missing-id")).rejects.toThrow(GraduationServiceError);
  });

  it("treats zero threshold as always met", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      likesCount: 0,
      viewsCount: 0,
      campaign: {
        ...baseCampaign,
        graduationVisitors: 0,
        graduationCommenters: 0,
        graduationLikes: 0,
        graduationVoters: 0,
        graduationVotingLevel: 0,
      },
    });
    commentFindMany.mockResolvedValueOnce([]);
    voteFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await getGraduationProgress("idea-1");

    expect(result.thresholds.visitors.met).toBe(true);
    expect(result.thresholds.commenters.met).toBe(true);
    expect(result.thresholds.likes.met).toBe(true);
    expect(result.thresholds.voters.met).toBe(true);
    expect(result.thresholds.votingLevel.met).toBe(true);
  });
});

describe("checkAndGraduateIdea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("graduates idea when all thresholds are met", async () => {
    // First call - getGraduationProgress
    ideaFindUnique.mockResolvedValueOnce(baseIdea);
    commentFindMany.mockResolvedValueOnce([
      { authorId: "u1" },
      { authorId: "u2" },
      { authorId: "u3" },
      { authorId: "u4" },
      { authorId: "u5" },
    ]);
    voteFindMany
      .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }])
      .mockResolvedValueOnce([{ score: 4 }, { score: 3 }, { score: 5 }]);

    // Second call - checkAndGraduateIdea fetches idea again
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      campaign: {
        ...baseCampaign,
      },
    });

    mockTransitionIdea.mockResolvedValueOnce({});

    const result = await checkAndGraduateIdea("idea-1", "actor-1");

    expect(result).toBe(true);
    expect(mockTransitionIdea).toHaveBeenCalledWith(
      { id: "idea-1", targetStatus: "HOT" },
      "actor-1",
    );
  });

  it("does not graduate when thresholds are not met", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      likesCount: 0,
      viewsCount: 0,
    });
    commentFindMany.mockResolvedValueOnce([]);
    voteFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await checkAndGraduateIdea("idea-1", "actor-1");

    expect(result).toBe(false);
    expect(mockTransitionIdea).not.toHaveBeenCalled();
  });

  it("does not graduate when idea is not in COMMUNITY_DISCUSSION", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      status: "QUALIFICATION",
    });
    commentFindMany.mockResolvedValueOnce([]);
    voteFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await checkAndGraduateIdea("idea-1", "actor-1");

    expect(result).toBe(false);
  });

  it("does not graduate when HOT transition is invalid for campaign phase", async () => {
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      campaign: {
        ...baseCampaign,
        graduationVisitors: 0,
        graduationCommenters: 0,
        graduationLikes: 0,
        graduationVoters: 0,
        graduationVotingLevel: 0,
      },
    });
    commentFindMany.mockResolvedValueOnce([]);
    voteFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    // Second call
    ideaFindUnique.mockResolvedValueOnce({
      ...baseIdea,
      campaign: { ...baseCampaign },
    });

    // transitionIdea throws when transition is invalid
    mockTransitionIdea.mockRejectedValueOnce(
      new Error("Cannot transition idea from Community Discussion to Hot"),
    );

    const result = await checkAndGraduateIdea("idea-1", "actor-1");

    expect(result).toBe(false);
  });
});
