import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  exportCampaignReport,
  exportPlatformReport,
  exportIdeaList,
  exportEvaluationResults,
  ExportServiceError,
} from "./export.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    idea: {
      findMany: vi.fn(),
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
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    evaluationSession: {
      findMany: vi.fn(),
    },
    evaluationResponse: {
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

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const campaignCount = prisma.campaign.count as unknown as Mock;
const campaignGroupBy = prisma.campaign.groupBy as unknown as Mock;
const ideaFindMany = prisma.idea.findMany as unknown as Mock;
const ideaGroupBy = prisma.idea.groupBy as unknown as Mock;
const ideaAggregate = prisma.idea.aggregate as unknown as Mock;
const ideaVoteCount = prisma.ideaVote.count as unknown as Mock;
const kpiSnapshotFindMany = prisma.campaignKpiSnapshot.findMany as unknown as Mock;
const projectCount = prisma.project.count as unknown as Mock;
const projectGroupBy = prisma.project.groupBy as unknown as Mock;
const userCount = prisma.user.count as unknown as Mock;
const evaluationSessionFindMany = prisma.evaluationSession.findMany as unknown as Mock;
const evaluationResponseFindMany = prisma.evaluationResponse.findMany as unknown as Mock;
const eventBusEmit = eventBus.emit as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

function mockCampaignBase() {
  campaignFindUnique.mockResolvedValue({
    id: "campaign-1",
    title: "Innovation Q1",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01"),
    submissionCloseDate: null,
    votingCloseDate: null,
    plannedCloseDate: null,
    launchedAt: new Date("2026-01-15"),
    closedAt: null,
    _count: { members: 10, ideas: 5 },
  });

  ideaGroupBy.mockResolvedValue([
    { status: "DRAFT", _count: { id: 2 } },
    { status: "COMMUNITY_DISCUSSION", _count: { id: 3 } },
  ]);

  ideaAggregate.mockResolvedValue({
    _sum: { likesCount: 20, commentsCount: 8 },
  });

  ideaVoteCount.mockResolvedValue(12);
  kpiSnapshotFindMany.mockResolvedValue([]);
  ideaFindMany.mockResolvedValue([]);
  evaluationSessionFindMany.mockResolvedValue([]);
}

describe("exportCampaignReport", () => {
  it("returns base64 Excel data and filename", async () => {
    mockCampaignBase();

    const result = await exportCampaignReport(
      {
        campaignId: "campaign-1",
        includeKpiTimeSeries: true,
        includeIdeaList: true,
        includeEvaluationResults: false,
      },
      "user-1",
    );

    expect(result.base64).toBeTruthy();
    expect(result.filename).toContain("campaign_report_");
    expect(result.filename).toContain("Innovation_Q1");
    expect(result.filename.endsWith(".xlsx")).toBe(true);
  });

  it("throws ExportServiceError when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      exportCampaignReport(
        {
          campaignId: "nonexistent",
          includeKpiTimeSeries: false,
          includeIdeaList: false,
          includeEvaluationResults: false,
        },
        "user-1",
      ),
    ).rejects.toThrow(ExportServiceError);
  });

  it("emits report.exported event", async () => {
    mockCampaignBase();

    await exportCampaignReport(
      {
        campaignId: "campaign-1",
        includeKpiTimeSeries: false,
        includeIdeaList: false,
        includeEvaluationResults: false,
      },
      "user-1",
    );

    expect(eventBusEmit).toHaveBeenCalledWith(
      "report.exported",
      expect.objectContaining({
        entity: "campaign",
        entityId: "campaign-1",
        actor: "user-1",
      }),
    );
  });

  it("includes KPI time series sheet when requested", async () => {
    mockCampaignBase();
    kpiSnapshotFindMany.mockResolvedValue([
      {
        snapshotDate: new Date("2026-03-01"),
        ideasSubmitted: 2,
        ideasQualified: 1,
        ideasHot: 0,
        ideasEvaluated: 0,
        ideasSelected: 0,
        totalComments: 5,
        totalVotes: 3,
        totalLikes: 10,
        totalParticipants: 8,
      },
    ]);

    const result = await exportCampaignReport(
      {
        campaignId: "campaign-1",
        includeKpiTimeSeries: true,
        includeIdeaList: false,
        includeEvaluationResults: false,
      },
      "user-1",
    );

    expect(result.base64).toBeTruthy();
    // The base64 string should be decodable
    const buffer = Buffer.from(result.base64, "base64");
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("includes idea list sheet when requested", async () => {
    mockCampaignBase();
    ideaFindMany.mockResolvedValue([
      {
        title: "Test Idea",
        status: "DRAFT",
        category: "Tech",
        tags: ["innovation", "ai"],
        likesCount: 5,
        commentsCount: 2,
        viewsCount: 100,
        submittedAt: null,
        createdAt: new Date("2026-02-01"),
        contributor: { name: "John Doe", email: "john@example.com" },
        coAuthors: [],
      },
    ]);

    const result = await exportCampaignReport(
      {
        campaignId: "campaign-1",
        includeKpiTimeSeries: false,
        includeIdeaList: true,
        includeEvaluationResults: false,
      },
      "user-1",
    );

    expect(result.base64).toBeTruthy();
  });
});

describe("exportPlatformReport", () => {
  it("returns base64 Excel data and filename", async () => {
    campaignCount.mockResolvedValue(10);
    projectCount.mockResolvedValue(5);
    userCount.mockResolvedValue(50);

    campaignGroupBy.mockResolvedValue([
      { status: "ACTIVE", _count: { id: 6 } },
      { status: "DRAFT", _count: { id: 4 } },
    ]);

    projectGroupBy.mockResolvedValue([
      { status: "ACTIVE", _count: { id: 3 } },
      { status: "COMPLETED", _count: { id: 2 } },
    ]);

    campaignFindMany.mockResolvedValue([
      {
        id: "c-1",
        title: "Top Campaign",
        status: "ACTIVE",
        createdAt: new Date("2026-01-01"),
        _count: { ideas: 20, members: 15 },
      },
    ]);

    ideaAggregate.mockResolvedValue({
      _sum: { likesCount: 10, commentsCount: 5 },
    });

    // Need to handle the two separate campaign.count calls
    campaignCount.mockResolvedValueOnce(10).mockResolvedValueOnce(6);

    const result = await exportPlatformReport({}, "user-1");

    expect(result.base64).toBeTruthy();
    expect(result.filename).toContain("platform_report_");
    expect(result.filename.endsWith(".xlsx")).toBe(true);
  });

  it("emits report.exported event", async () => {
    campaignCount.mockResolvedValue(0);
    projectCount.mockResolvedValue(0);
    userCount.mockResolvedValue(0);
    campaignGroupBy.mockResolvedValue([]);
    projectGroupBy.mockResolvedValue([]);
    campaignFindMany.mockResolvedValue([]);

    await exportPlatformReport({}, "user-1");

    expect(eventBusEmit).toHaveBeenCalledWith(
      "report.exported",
      expect.objectContaining({
        entity: "platform",
        actor: "user-1",
      }),
    );
  });
});

describe("exportIdeaList", () => {
  it("returns base64 Excel data with idea list", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Innovation Q1",
    });

    ideaFindMany.mockResolvedValue([
      {
        title: "Smart Widget",
        status: "COMMUNITY_DISCUSSION",
        category: "Product",
        tags: ["iot"],
        likesCount: 15,
        commentsCount: 7,
        viewsCount: 200,
        submittedAt: new Date("2026-02-10"),
        createdAt: new Date("2026-02-01"),
        contributor: { name: "Alice", email: "alice@test.com" },
        coAuthors: [{ user: { name: "Bob" } }],
      },
    ]);

    const result = await exportIdeaList({ campaignId: "campaign-1" }, "user-1");

    expect(result.base64).toBeTruthy();
    expect(result.filename).toContain("ideas_");
    expect(result.filename).toContain("Innovation_Q1");
  });

  it("throws ExportServiceError when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(exportIdeaList({ campaignId: "nonexistent" }, "user-1")).rejects.toThrow(
      ExportServiceError,
    );
  });

  it("passes status filter to query", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Test",
    });
    ideaFindMany.mockResolvedValue([]);

    await exportIdeaList({ campaignId: "campaign-1", statuses: ["DRAFT", "HOT"] }, "user-1");

    expect(ideaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["DRAFT", "HOT"] },
        }),
      }),
    );
  });
});

describe("exportEvaluationResults", () => {
  it("returns base64 Excel data with evaluation sessions", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Innovation Q1",
    });

    evaluationSessionFindMany.mockResolvedValue([
      {
        id: "session-1",
        title: "Round 1 Evaluation",
        type: "SCORECARD",
        mode: "STANDARD",
        status: "COMPLETED",
        dueDate: new Date("2026-03-15"),
        createdAt: new Date("2026-03-01"),
        criteria: [
          { id: "crit-1", title: "Innovation", weight: 2.0 },
          { id: "crit-2", title: "Feasibility", weight: 1.0 },
        ],
        ideas: [
          { idea: { id: "idea-1", title: "Smart Widget" } },
          { idea: { id: "idea-2", title: "Green Energy" } },
        ],
      },
    ]);

    evaluationResponseFindMany.mockResolvedValue([
      { ideaId: "idea-1", criterionId: "crit-1", scoreValue: 8 },
      { ideaId: "idea-1", criterionId: "crit-2", scoreValue: 6 },
      { ideaId: "idea-2", criterionId: "crit-1", scoreValue: 9 },
      { ideaId: "idea-2", criterionId: "crit-2", scoreValue: 7 },
    ]);

    const result = await exportEvaluationResults({ campaignId: "campaign-1" }, "user-1");

    expect(result.base64).toBeTruthy();
    expect(result.filename).toContain("evaluation_results_");
    expect(result.filename).toContain("Innovation_Q1");
  });

  it("throws ExportServiceError when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(exportEvaluationResults({ campaignId: "nonexistent" }, "user-1")).rejects.toThrow(
      ExportServiceError,
    );
  });

  it("handles sessions with no criteria gracefully", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Test",
    });

    evaluationSessionFindMany.mockResolvedValue([
      {
        id: "session-1",
        title: "Empty Session",
        type: "SCORECARD",
        mode: "STANDARD",
        status: "DRAFT",
        dueDate: null,
        createdAt: new Date("2026-03-01"),
        criteria: [],
        ideas: [],
      },
    ]);

    const result = await exportEvaluationResults({ campaignId: "campaign-1" }, "user-1");

    expect(result.base64).toBeTruthy();
  });

  it("handles no evaluation sessions gracefully", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "campaign-1",
      title: "Test",
    });
    evaluationSessionFindMany.mockResolvedValue([]);

    const result = await exportEvaluationResults({ campaignId: "campaign-1" }, "user-1");

    expect(result.base64).toBeTruthy();
  });
});

describe("ExportServiceError", () => {
  it("has the correct name and code", () => {
    const error = new ExportServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
    expect(error.name).toBe("ExportServiceError");
    expect(error.code).toBe("CAMPAIGN_NOT_FOUND");
    expect(error.message).toBe("Campaign not found");
  });
});
