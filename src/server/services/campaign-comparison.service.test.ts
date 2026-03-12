import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  compareCampaigns,
  getSuccessFactors,
  getOrganizationAnalysis,
  CampaignComparisonServiceError,
} from "./campaign-comparison.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
    },
    idea: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    ideaVote: {
      count: vi.fn(),
    },
    ideaLike: {
      count: vi.fn(),
    },
    campaignKpiSnapshot: {
      findMany: vi.fn(),
    },
    comment: {
      count: vi.fn(),
    },
    campaignMember: {
      count: vi.fn(),
    },
    orgUnit: {
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

const { prisma } = await import("@/server/lib/prisma");

const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const ideaGroupBy = prisma.idea.groupBy as unknown as Mock;
const ideaAggregate = prisma.idea.aggregate as unknown as Mock;
const ideaCount = prisma.idea.count as unknown as Mock;
const ideaVoteCount = prisma.ideaVote.count as unknown as Mock;
const ideaLikeCount = prisma.ideaLike.count as unknown as Mock;
const kpiSnapshotFindMany = prisma.campaignKpiSnapshot.findMany as unknown as Mock;
const commentCount = prisma.comment.count as unknown as Mock;
const campaignMemberCount = prisma.campaignMember.count as unknown as Mock;
const orgUnitFindMany = prisma.orgUnit.findMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── compareCampaigns ─────────────────────────────────────────

describe("compareCampaigns", () => {
  const mockCampaigns = [
    {
      id: "campaign-1",
      title: "Innovation Q1",
      status: "SUBMISSION",
      createdAt: new Date("2026-01-01"),
      launchedAt: new Date("2026-01-15"),
      closedAt: null,
      hasSeedingPhase: true,
      hasDiscussionPhase: true,
      hasCommunityGraduation: true,
      hasQualificationPhase: false,
      hasVoting: true,
      hasLikes: true,
      hasIdeaCoach: false,
      _count: { members: 25, ideas: 10 },
    },
    {
      id: "campaign-2",
      title: "Innovation Q2",
      status: "CLOSED",
      createdAt: new Date("2026-04-01"),
      launchedAt: new Date("2026-04-10"),
      closedAt: new Date("2026-06-10"),
      hasSeedingPhase: false,
      hasDiscussionPhase: true,
      hasCommunityGraduation: false,
      hasQualificationPhase: true,
      hasVoting: true,
      hasLikes: true,
      hasIdeaCoach: true,
      _count: { members: 40, ideas: 30 },
    },
  ];

  it("returns side-by-side comparison of campaigns", async () => {
    campaignFindMany.mockResolvedValue(mockCampaigns);
    ideaGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { id: 3 } },
      { status: "HOT", _count: { id: 2 } },
    ]);
    ideaAggregate.mockResolvedValue({
      _sum: { likesCount: 20, commentsCount: 10 },
    });
    ideaVoteCount.mockResolvedValue(5);
    kpiSnapshotFindMany.mockResolvedValue([]);

    const result = await compareCampaigns({
      campaignIds: ["campaign-1", "campaign-2"],
    });

    expect(result.campaigns).toHaveLength(2);
    expect(result.campaigns[0]?.title).toBe("Innovation Q1");
    expect(result.campaigns[1]?.title).toBe("Innovation Q2");
    expect(result.campaigns[0]?.memberCount).toBe(25);
    expect(result.campaigns[1]?.memberCount).toBe(40);
    expect(result.comparedAt).toBeDefined();
  });

  it("throws INSUFFICIENT_CAMPAIGNS when fewer than 2 valid campaigns found", async () => {
    campaignFindMany.mockResolvedValue([mockCampaigns[0]]);

    await expect(compareCampaigns({ campaignIds: ["campaign-1", "nonexistent"] })).rejects.toThrow(
      CampaignComparisonServiceError,
    );

    await expect(compareCampaigns({ campaignIds: ["campaign-1", "nonexistent"] })).rejects.toThrow(
      "At least 2 valid campaigns are required",
    );
  });

  it("includes engagement metrics from aggregated data", async () => {
    campaignFindMany.mockResolvedValue(mockCampaigns);
    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({
      _sum: { likesCount: 42, commentsCount: 18 },
    });
    ideaVoteCount.mockResolvedValue(15);
    kpiSnapshotFindMany.mockResolvedValue([
      {
        snapshotDate: new Date("2026-03-01"),
        ideasSubmitted: 5,
        totalComments: 8,
        totalVotes: 12,
        totalLikes: 20,
        totalViews: 100,
        uniqueVisitors: 50,
      },
    ]);

    const result = await compareCampaigns({
      campaignIds: ["campaign-1", "campaign-2"],
    });

    expect(result.campaigns[0]?.engagement.totalLikes).toBe(42);
    expect(result.campaigns[0]?.engagement.totalComments).toBe(18);
    expect(result.campaigns[0]?.engagement.totalVotes).toBe(15);
    expect(result.campaigns[0]?.engagement.totalViews).toBe(100);
    expect(result.campaigns[0]?.engagement.uniqueVisitors).toBe(50);
  });

  it("calculates duration for campaigns with launch date", async () => {
    campaignFindMany.mockResolvedValue(mockCampaigns);
    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);
    kpiSnapshotFindMany.mockResolvedValue([]);

    const result = await compareCampaigns({
      campaignIds: ["campaign-1", "campaign-2"],
    });

    // Campaign 2 has closedAt, so duration is deterministic
    expect(result.campaigns[1]?.durationDays).toBe(61);
  });

  it("includes configuration flags for each campaign", async () => {
    campaignFindMany.mockResolvedValue(mockCampaigns);
    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);
    kpiSnapshotFindMany.mockResolvedValue([]);

    const result = await compareCampaigns({
      campaignIds: ["campaign-1", "campaign-2"],
    });

    expect(result.campaigns[0]?.configuration.hasSeedingPhase).toBe(true);
    expect(result.campaigns[0]?.configuration.hasIdeaCoach).toBe(false);
    expect(result.campaigns[1]?.configuration.hasSeedingPhase).toBe(false);
    expect(result.campaigns[1]?.configuration.hasIdeaCoach).toBe(true);
  });
});

// ── getSuccessFactors ────────────────────────────────────────

describe("getSuccessFactors", () => {
  it("returns success factor analysis for campaigns", async () => {
    campaignFindMany.mockResolvedValue([
      {
        id: "campaign-1",
        title: "High Performer",
        status: "CLOSED",
        launchedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-03-01"),
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
        hasCommunityGraduation: true,
        hasQualificationPhase: false,
        hasVoting: true,
        hasLikes: true,
        hasIdeaCoach: false,
        _count: { members: 50, ideas: 40 },
      },
      {
        id: "campaign-2",
        title: "Low Performer",
        status: "CLOSED",
        launchedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-02-01"),
        hasSeedingPhase: false,
        hasDiscussionPhase: false,
        hasCommunityGraduation: false,
        hasQualificationPhase: false,
        hasVoting: false,
        hasLikes: true,
        hasIdeaCoach: false,
        _count: { members: 10, ideas: 3 },
      },
    ]);

    ideaGroupBy.mockResolvedValue([
      { status: "HOT", _count: { id: 5 } },
      { status: "SELECTED_IMPLEMENTATION", _count: { id: 3 } },
    ]);
    ideaAggregate.mockResolvedValue({
      _sum: { likesCount: 30, commentsCount: 20 },
    });
    ideaVoteCount.mockResolvedValue(10);

    const result = await getSuccessFactors({});

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.successScore).toBeGreaterThan(0);
    expect(result.averages.avgDurationDays).toBeDefined();
    expect(result.averages.avgIdeasPerMember).toBeGreaterThan(0);
    expect(result.analyzedAt).toBeDefined();
  });

  it("sorts entries by success score descending", async () => {
    campaignFindMany.mockResolvedValue([
      {
        id: "low",
        title: "Low",
        status: "CLOSED",
        launchedAt: null,
        closedAt: null,
        hasSeedingPhase: false,
        hasDiscussionPhase: false,
        hasCommunityGraduation: false,
        hasQualificationPhase: false,
        hasVoting: false,
        hasLikes: false,
        hasIdeaCoach: false,
        _count: { members: 5, ideas: 1 },
      },
      {
        id: "high",
        title: "High",
        status: "CLOSED",
        launchedAt: null,
        closedAt: null,
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
        hasCommunityGraduation: true,
        hasQualificationPhase: true,
        hasVoting: true,
        hasLikes: true,
        hasIdeaCoach: true,
        _count: { members: 100, ideas: 50 },
      },
    ]);

    // First call (low campaign): no hot/selected ideas, low engagement
    ideaGroupBy.mockResolvedValueOnce([]);
    ideaAggregate.mockResolvedValueOnce({
      _sum: { likesCount: 0, commentsCount: 0 },
    });
    ideaVoteCount.mockResolvedValueOnce(0);

    // Second call (high campaign): many hot/selected ideas, high engagement
    ideaGroupBy.mockResolvedValueOnce([
      { status: "HOT", _count: { id: 10 } },
      { status: "SELECTED_IMPLEMENTATION", _count: { id: 5 } },
    ]);
    ideaAggregate.mockResolvedValueOnce({
      _sum: { likesCount: 50, commentsCount: 40 },
    });
    ideaVoteCount.mockResolvedValueOnce(30);

    const result = await getSuccessFactors({});

    expect(result.entries[0]?.campaignId).toBe("high");
    expect(result.entries[1]?.campaignId).toBe("low");
    expect(result.entries[0]!.successScore).toBeGreaterThan(result.entries[1]!.successScore);
  });

  it("returns empty entries when no campaigns match", async () => {
    campaignFindMany.mockResolvedValue([]);

    const result = await getSuccessFactors({});

    expect(result.entries).toHaveLength(0);
    expect(result.averages.avgDurationDays).toBeNull();
    expect(result.averages.avgIdeasPerMember).toBe(0);
    expect(result.averages.avgSuccessScore).toBe(0);
  });

  it("includes configuration details in each entry", async () => {
    campaignFindMany.mockResolvedValue([
      {
        id: "campaign-1",
        title: "Test",
        status: "SUBMISSION",
        launchedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-04-01"),
        hasSeedingPhase: true,
        hasDiscussionPhase: true,
        hasCommunityGraduation: false,
        hasQualificationPhase: false,
        hasVoting: true,
        hasLikes: true,
        hasIdeaCoach: true,
        _count: { members: 20, ideas: 15 },
      },
    ]);
    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);

    const result = await getSuccessFactors({});

    expect(result.entries[0]?.configuration.durationDays).toBe(90);
    expect(result.entries[0]?.configuration.phaseCount).toBe(3); // seeding + discussion + voting
    expect(result.entries[0]?.configuration.hasIdeaCoach).toBe(true);
  });
});

// ── getOrganizationAnalysis ──────────────────────────────────

describe("getOrganizationAnalysis", () => {
  it("returns activity metrics per org unit", async () => {
    orgUnitFindMany.mockResolvedValue([
      {
        id: "ou-1",
        name: "Engineering",
        userAssignments: [{ userId: "user-1" }, { userId: "user-2" }],
      },
      {
        id: "ou-2",
        name: "Marketing",
        userAssignments: [{ userId: "user-3" }],
      },
    ]);

    ideaCount
      .mockResolvedValueOnce(10) // engineering ideas
      .mockResolvedValueOnce(5); // marketing ideas
    commentCount
      .mockResolvedValueOnce(20) // engineering comments
      .mockResolvedValueOnce(8); // marketing comments
    ideaVoteCount
      .mockResolvedValueOnce(15) // engineering votes
      .mockResolvedValueOnce(3); // marketing votes
    ideaLikeCount
      .mockResolvedValueOnce(30) // engineering likes
      .mockResolvedValueOnce(12); // marketing likes
    campaignMemberCount
      .mockResolvedValueOnce(4) // engineering campaign memberships
      .mockResolvedValueOnce(2); // marketing campaign memberships

    const result = await getOrganizationAnalysis({});

    expect(result.orgUnits).toHaveLength(2);

    const engineering = result.orgUnits.find((o) => o.orgUnitName === "Engineering");
    expect(engineering).toBeDefined();
    expect(engineering!.memberCount).toBe(2);
    expect(engineering!.ideasSubmitted).toBe(10);
    expect(engineering!.commentsContributed).toBe(20);
    expect(engineering!.votesParticipated).toBe(15);
    expect(engineering!.likesGiven).toBe(30);
    expect(engineering!.campaignsParticipated).toBe(4);

    const marketing = result.orgUnits.find((o) => o.orgUnitName === "Marketing");
    expect(marketing).toBeDefined();
    expect(marketing!.memberCount).toBe(1);
    expect(marketing!.ideasSubmitted).toBe(5);

    expect(result.totals.totalOrgUnits).toBe(2);
    expect(result.totals.totalMembers).toBe(3);
    expect(result.totals.totalIdeas).toBe(15);
  });

  it("handles org units with no members", async () => {
    orgUnitFindMany.mockResolvedValue([
      {
        id: "ou-1",
        name: "Empty Department",
        userAssignments: [],
      },
    ]);

    const result = await getOrganizationAnalysis({});

    expect(result.orgUnits).toHaveLength(1);
    expect(result.orgUnits[0]?.memberCount).toBe(0);
    expect(result.orgUnits[0]?.ideasSubmitted).toBe(0);
    expect(result.orgUnits[0]?.commentsContributed).toBe(0);
    expect(result.orgUnits[0]?.votesParticipated).toBe(0);
    expect(result.orgUnits[0]?.likesGiven).toBe(0);
    expect(result.orgUnits[0]?.campaignsParticipated).toBe(0);
  });

  it("returns empty results when no org units exist", async () => {
    orgUnitFindMany.mockResolvedValue([]);

    const result = await getOrganizationAnalysis({});

    expect(result.orgUnits).toHaveLength(0);
    expect(result.totals.totalOrgUnits).toBe(0);
    expect(result.totals.totalMembers).toBe(0);
  });

  it("filters by specific org unit IDs", async () => {
    orgUnitFindMany.mockResolvedValue([
      {
        id: "ou-1",
        name: "Engineering",
        userAssignments: [{ userId: "user-1" }],
      },
    ]);

    ideaCount.mockResolvedValue(5);
    commentCount.mockResolvedValue(3);
    ideaVoteCount.mockResolvedValue(2);
    ideaLikeCount.mockResolvedValue(7);
    campaignMemberCount.mockResolvedValue(1);

    await getOrganizationAnalysis({ orgUnitIds: ["ou-1"] });

    expect(orgUnitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["ou-1"] },
        }),
      }),
    );
  });
});
