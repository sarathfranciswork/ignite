import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  compareCampaigns,
  getSuccessFactors,
  CampaignComparisonError,
} from "./campaign-comparison.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
    },
    idea: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    ideaVote: {
      count: vi.fn(),
    },
    evaluationShortlistItem: {
      count: vi.fn(),
    },
    evaluationSession: {
      count: vi.fn(),
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
const ideaVoteCount = prisma.ideaVote.count as unknown as Mock;
const shortlistCount = prisma.evaluationShortlistItem.count as unknown as Mock;
const evalSessionCount = prisma.evaluationSession.count as unknown as Mock;
const evalSessionFindMany = prisma.evaluationSession.findMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: "campaign-1",
    title: "Innovation Q1",
    status: "SUBMISSION",
    launchedAt: new Date("2026-01-01"),
    closedAt: new Date("2026-02-01"),
    createdAt: new Date("2025-12-15"),
    hasIdeaCoach: false,
    votingCriteria: null,
    graduationLikes: 5,
    graduationCommenters: 3,
    graduationVisitors: 10,
    graduationVoters: 0,
    _count: { members: 50, ideas: 20 },
    ...overrides,
  };
}

describe("compareCampaigns", () => {
  it("returns comparison data for two campaigns", async () => {
    const campaign1 = makeCampaign({ id: "c-1", title: "Campaign A" });
    const campaign2 = makeCampaign({
      id: "c-2",
      title: "Campaign B",
      hasIdeaCoach: true,
      _count: { members: 30, ideas: 15 },
    });

    campaignFindMany.mockResolvedValue([campaign1, campaign2]);

    ideaGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { id: 5 } },
      { status: "COMMUNITY_DISCUSSION", _count: { id: 10 } },
      { status: "HOT", _count: { id: 3 } },
      { status: "EVALUATION", _count: { id: 2 } },
    ]);
    ideaAggregate.mockResolvedValue({
      _sum: { likesCount: 100, commentsCount: 50 },
    });
    ideaVoteCount.mockResolvedValue(30);
    shortlistCount.mockResolvedValue(5);
    evalSessionCount
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const result = await compareCampaigns({ campaignIds: ["c-1", "c-2"] });

    expect(result.campaigns).toHaveLength(2);
    expect(result.campaigns[0]?.campaignId).toBe("c-1");
    expect(result.campaigns[1]?.campaignId).toBe("c-2");
    expect(result.highlights.length).toBeGreaterThan(0);
    expect(result.radarMetrics.length).toBeGreaterThan(0);
  });

  it("throws error when fewer than 2 campaigns found", async () => {
    campaignFindMany.mockResolvedValue([makeCampaign()]);

    await expect(compareCampaigns({ campaignIds: ["c-1", "c-2"] })).rejects.toThrow(
      CampaignComparisonError,
    );
    await expect(compareCampaigns({ campaignIds: ["c-1", "c-2"] })).rejects.toThrow(
      "At least 2 valid campaigns are required",
    );
  });

  it("calculates participation rate correctly", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ id: "c-1", _count: { members: 100, ideas: 25 } }),
      makeCampaign({ id: "c-2", _count: { members: 50, ideas: 30 } }),
    ]);

    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);
    shortlistCount.mockResolvedValue(0);
    evalSessionCount.mockResolvedValue(0);

    const result = await compareCampaigns({ campaignIds: ["c-1", "c-2"] });

    expect(result.campaigns[0]?.participationRate).toBe(0.25);
    expect(result.campaigns[1]?.participationRate).toBe(0.6);
  });

  it("highlights significant metric differences", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ id: "c-1", _count: { members: 10, ideas: 50 } }),
      makeCampaign({ id: "c-2", _count: { members: 100, ideas: 5 } }),
    ]);

    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);
    shortlistCount.mockResolvedValue(0);
    evalSessionCount.mockResolvedValue(0);

    const result = await compareCampaigns({ campaignIds: ["c-1", "c-2"] });

    const ideaHighlight = result.highlights.find((h) => h.metric === "Idea Count");
    expect(ideaHighlight?.isSignificant).toBe(true);
  });

  it("normalizes radar metrics to 0-100 scale", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ id: "c-1", _count: { members: 50, ideas: 20 } }),
      makeCampaign({ id: "c-2", _count: { members: 50, ideas: 10 } }),
    ]);

    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);
    shortlistCount.mockResolvedValue(0);
    evalSessionCount.mockResolvedValue(0);

    const result = await compareCampaigns({ campaignIds: ["c-1", "c-2"] });

    for (const radarMetric of result.radarMetrics) {
      for (const v of radarMetric.values) {
        expect(v.value).toBeGreaterThanOrEqual(0);
        expect(v.value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("getSuccessFactors", () => {
  it("returns empty results when no campaigns exist", async () => {
    campaignFindMany.mockResolvedValue([]);

    const result = await getSuccessFactors({});

    expect(result.correlations).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
    expect(result.campaignCount).toBe(0);
  });

  it("returns correlations for multiple campaigns", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ id: "c-1", title: "A" }),
      makeCampaign({ id: "c-2", title: "B", hasIdeaCoach: true }),
      makeCampaign({ id: "c-3", title: "C" }),
    ]);

    ideaGroupBy.mockResolvedValue([
      { status: "HOT", _count: { id: 3 } },
      { status: "DRAFT", _count: { id: 5 } },
    ]);
    ideaVoteCount.mockResolvedValue(10);
    evalSessionFindMany.mockResolvedValue([{ status: "COMPLETED", _count: { responses: 5 } }]);

    const result = await getSuccessFactors({});

    expect(result.campaignCount).toBe(3);
    expect(result.correlations).toHaveLength(5);

    const durationCorr = result.correlations.find((c) => c.factor === "duration_vs_participation");
    expect(durationCorr).toBeDefined();
    expect(durationCorr!.dataPoints).toHaveLength(3);
    expect(durationCorr!.correlationStrength).toBeGreaterThanOrEqual(0);
    expect(durationCorr!.correlationStrength).toBeLessThanOrEqual(1);
  });

  it("generates recommendations when enough data exists", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({
        id: "c-1",
        title: "Good",
        hasIdeaCoach: true,
        _count: { members: 50, ideas: 40 },
        launchedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-01-21"),
      }),
      makeCampaign({
        id: "c-2",
        title: "OK",
        hasIdeaCoach: false,
        _count: { members: 50, ideas: 20 },
        launchedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-02-15"),
      }),
      makeCampaign({
        id: "c-3",
        title: "Bad",
        hasIdeaCoach: false,
        _count: { members: 100, ideas: 10 },
        launchedAt: new Date("2026-01-01"),
        closedAt: new Date("2026-03-01"),
      }),
    ]);

    ideaGroupBy.mockResolvedValue([]);
    ideaVoteCount.mockResolvedValue(0);
    evalSessionFindMany.mockResolvedValue([]);

    const result = await getSuccessFactors({});

    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("applies date range filter when provided", async () => {
    campaignFindMany.mockResolvedValue([]);

    await getSuccessFactors({
      dateRange: { from: "2026-01-01T00:00:00.000Z" },
    });

    expect(campaignFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it("includes all five correlation factors", async () => {
    campaignFindMany.mockResolvedValue([
      makeCampaign({ id: "c-1" }),
      makeCampaign({ id: "c-2" }),
      makeCampaign({ id: "c-3" }),
    ]);

    ideaGroupBy.mockResolvedValue([]);
    ideaVoteCount.mockResolvedValue(0);
    evalSessionFindMany.mockResolvedValue([]);

    const result = await getSuccessFactors({});

    const factorNames = result.correlations.map((c) => c.factor);
    expect(factorNames).toContain("duration_vs_participation");
    expect(factorNames).toContain("voting_criteria_vs_eval_quality");
    expect(factorNames).toContain("audience_size_vs_participation");
    expect(factorNames).toContain("graduation_threshold_vs_hot_rate");
    expect(factorNames).toContain("coach_vs_participation");
  });
});
