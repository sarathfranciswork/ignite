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

vi.mock("@/server/lib/state-machines/idea-transitions", () => ({
  isValidIdeaTransition: vi.fn(),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const { isValidIdeaTransition } = await import("@/server/lib/state-machines/idea-transitions");

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const ideaUpdate = prisma.idea.update as unknown as Mock;
const commentFindMany = prisma.comment.findMany as unknown as Mock;
const voteFindMany = prisma.ideaVote.findMany as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;
const mockIsValidTransition = isValidIdeaTransition as unknown as Mock;

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

    mockIsValidTransition.mockReturnValueOnce(true);
    ideaUpdate.mockResolvedValueOnce({});

    const result = await checkAndGraduateIdea("idea-1", "actor-1");

    expect(result).toBe(true);
    expect(ideaUpdate).toHaveBeenCalledWith({
      where: { id: "idea-1" },
      data: {
        previousStatus: "COMMUNITY_DISCUSSION",
        status: "HOT",
      },
    });
    expect(mockEmit).toHaveBeenCalledWith(
      "idea.statusChanged",
      expect.objectContaining({
        entity: "idea",
        entityId: "idea-1",
        metadata: expect.objectContaining({
          newStatus: "HOT",
          reason: "community_graduation",
        }),
      }),
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
    expect(ideaUpdate).not.toHaveBeenCalled();
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

    mockIsValidTransition.mockReturnValueOnce(false);

    const result = await checkAndGraduateIdea("idea-1", "actor-1");

    expect(result).toBe(false);
    expect(ideaUpdate).not.toHaveBeenCalled();
  });
});
