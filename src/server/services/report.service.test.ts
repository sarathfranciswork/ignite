import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getCampaignOverview,
  getPortfolioAnalysis,
  getIdeaFunnel,
  getPlatformSummary,
  ReportServiceError,
} from "./report.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    idea: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    ideaVote: {
      count: vi.fn(),
    },
    campaignKpiSnapshot: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      count: vi.fn(),
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

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const campaignCount = prisma.campaign.count as unknown as Mock;
const campaignGroupBy = prisma.campaign.groupBy as unknown as Mock;
const ideaGroupBy = prisma.idea.groupBy as unknown as Mock;
const ideaAggregate = prisma.idea.aggregate as unknown as Mock;
const ideaCount = prisma.idea.count as unknown as Mock;
const ideaVoteCount = prisma.ideaVote.count as unknown as Mock;
const kpiSnapshotFindMany = prisma.campaignKpiSnapshot.findMany as unknown as Mock;
const projectFindMany = prisma.project.findMany as unknown as Mock;
const projectCount = prisma.project.count as unknown as Mock;
const projectGroupBy = prisma.project.groupBy as unknown as Mock;
const userCount = prisma.user.count as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCampaignOverview", () => {
  it("returns campaign overview with metrics", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Innovation Q1",
      status: "SUBMISSION",
      createdAt: new Date("2026-01-01"),
      _count: { members: 25, ideas: 10 },
    });

    ideaGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { id: 3 } },
      { status: "COMMUNITY_DISCUSSION", _count: { id: 5 } },
      { status: "HOT", _count: { id: 2 } },
    ]);

    ideaAggregate.mockResolvedValue({
      _sum: { likesCount: 42, commentsCount: 18 },
    });

    ideaVoteCount.mockResolvedValue(15);
    kpiSnapshotFindMany.mockResolvedValue([]);

    const result = await getCampaignOverview({ campaignId: "campaign-1" });

    expect(result.campaign.title).toBe("Innovation Q1");
    expect(result.memberCount).toBe(25);
    expect(result.ideaCount).toBe(10);
    expect(result.ideaStatusBreakdown.DRAFT).toBe(3);
    expect(result.ideaStatusBreakdown.COMMUNITY_DISCUSSION).toBe(5);
    expect(result.ideaStatusBreakdown.HOT).toBe(2);
    expect(result.engagementMetrics.totalLikes).toBe(42);
    expect(result.engagementMetrics.totalComments).toBe(18);
    expect(result.engagementMetrics.totalVotes).toBe(15);
  });

  it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(getCampaignOverview({ campaignId: "nonexistent" })).rejects.toThrow(
      ReportServiceError,
    );
    await expect(getCampaignOverview({ campaignId: "nonexistent" })).rejects.toThrow(
      "Campaign not found",
    );
  });

  it("includes KPI time series when snapshots exist", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Test",
      status: "SUBMISSION",
      createdAt: new Date(),
      _count: { members: 5, ideas: 3 },
    });

    ideaGroupBy.mockResolvedValue([]);
    ideaAggregate.mockResolvedValue({ _sum: { likesCount: 0, commentsCount: 0 } });
    ideaVoteCount.mockResolvedValue(0);
    kpiSnapshotFindMany.mockResolvedValue([
      {
        snapshotDate: new Date("2026-03-01"),
        ideasSubmitted: 2,
        totalComments: 5,
        totalVotes: 10,
      },
      {
        snapshotDate: new Date("2026-03-02"),
        ideasSubmitted: 3,
        totalComments: 8,
        totalVotes: 12,
      },
    ]);

    const result = await getCampaignOverview({ campaignId: "campaign-1" });

    expect(result.kpiTimeSeries).toHaveLength(2);
    expect(result.kpiTimeSeries[0]?.date).toBe("2026-03-01");
    expect(result.kpiTimeSeries[0]?.ideasSubmitted).toBe(2);
  });
});

describe("getPortfolioAnalysis", () => {
  it("returns projects grouped by process definition", async () => {
    projectFindMany.mockResolvedValue([
      {
        id: "proj-1",
        status: "ACTIVE",
        processDefinitionId: "pd-1",
        processDefinition: { id: "pd-1", name: "Stage-Gate" },
        currentPhase: { id: "phase-1", name: "Discovery" },
      },
      {
        id: "proj-2",
        status: "ACTIVE",
        processDefinitionId: "pd-1",
        processDefinition: { id: "pd-1", name: "Stage-Gate" },
        currentPhase: { id: "phase-2", name: "Scoping" },
      },
      {
        id: "proj-3",
        status: "COMPLETED",
        processDefinitionId: "pd-2",
        processDefinition: { id: "pd-2", name: "Lean Startup" },
        currentPhase: null,
      },
    ]);

    const result = await getPortfolioAnalysis({});

    expect(result).toHaveLength(2);

    const stageGate = result.find((r) => r.processDefinition.name === "Stage-Gate");
    expect(stageGate).toBeDefined();
    expect(stageGate!.totalProjects).toBe(2);
    expect(stageGate!.statusBreakdown.ACTIVE).toBe(2);
    expect(stageGate!.phaseDistribution).toHaveLength(2);

    const leanStartup = result.find((r) => r.processDefinition.name === "Lean Startup");
    expect(leanStartup).toBeDefined();
    expect(leanStartup!.totalProjects).toBe(1);
    expect(leanStartup!.statusBreakdown.COMPLETED).toBe(1);
  });

  it("filters by process definition ID", async () => {
    projectFindMany.mockResolvedValue([]);

    await getPortfolioAnalysis({ processDefinitionId: "pd-1" });

    expect(projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ processDefinitionId: "pd-1" }),
      }),
    );
  });

  it("filters by project status", async () => {
    projectFindMany.mockResolvedValue([]);

    await getPortfolioAnalysis({ status: "ACTIVE" });

    expect(projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("returns empty array when no projects exist", async () => {
    projectFindMany.mockResolvedValue([]);

    const result = await getPortfolioAnalysis({});

    expect(result).toHaveLength(0);
  });
});

describe("getIdeaFunnel", () => {
  it("returns idea funnel for a campaign", async () => {
    campaignFindUnique.mockResolvedValue({ id: "campaign-1", title: "Innovation Q1" });

    ideaGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { id: 10 } },
      { status: "COMMUNITY_DISCUSSION", _count: { id: 7 } },
      { status: "HOT", _count: { id: 3 } },
      { status: "EVALUATION", _count: { id: 1 } },
    ]);

    const result = await getIdeaFunnel({ campaignId: "campaign-1" });

    expect(result.campaignTitle).toBe("Innovation Q1");
    expect(result.totalIdeas).toBe(21);
    expect(result.funnel).toHaveLength(8);

    const draft = result.funnel.find((f) => f.status === "DRAFT");
    expect(draft?.count).toBe(10);

    const hot = result.funnel.find((f) => f.status === "HOT");
    expect(hot?.count).toBe(3);

    const archived = result.funnel.find((f) => f.status === "ARCHIVED");
    expect(archived?.count).toBe(0);
  });

  it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(getIdeaFunnel({ campaignId: "nonexistent" })).rejects.toThrow(ReportServiceError);
  });
});

describe("getPlatformSummary", () => {
  it("returns platform-wide metrics", async () => {
    campaignCount.mockResolvedValueOnce(10).mockResolvedValueOnce(6);
    ideaCount.mockResolvedValue(150);
    projectCount.mockResolvedValue(25);
    userCount.mockResolvedValue(100);

    campaignGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { id: 4 } },
      { status: "SUBMISSION", _count: { id: 3 } },
      { status: "CLOSED", _count: { id: 3 } },
    ]);

    projectGroupBy.mockResolvedValue([
      { status: "ACTIVE", _count: { id: 20 } },
      { status: "COMPLETED", _count: { id: 5 } },
    ]);

    campaignFindMany.mockResolvedValue([
      {
        id: "c-1",
        title: "Top Campaign",
        status: "SUBMISSION",
        _count: { ideas: 50, members: 30 },
      },
    ]);

    const result = await getPlatformSummary({});

    expect(result.totalCampaigns).toBe(10);
    expect(result.activeCampaigns).toBe(6);
    expect(result.totalIdeas).toBe(150);
    expect(result.totalProjects).toBe(25);
    expect(result.totalUsers).toBe(100);
    expect(result.campaignStatusBreakdown.DRAFT).toBe(4);
    expect(result.projectStatusBreakdown.ACTIVE).toBe(20);
    expect(result.topCampaigns).toHaveLength(1);
    expect(result.topCampaigns[0]?.title).toBe("Top Campaign");
  });
});
