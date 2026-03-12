import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getPendingEvaluations,
  getActiveCampaigns,
  getRecentIdeas,
  getActivityFeed,
  getPlatformKpis,
  getDashboardOverview,
} from "./dashboard.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    evaluationSessionEvaluator: { findMany: vi.fn() },
    evaluationResponse: { count: vi.fn() },
    campaignMember: { findMany: vi.fn() },
    idea: { findMany: vi.fn(), count: vi.fn() },
    activityEvent: { findMany: vi.fn() },
    campaign: { count: vi.fn() },
    user: { count: vi.fn() },
    evaluationSession: { count: vi.fn() },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

const { prisma } = await import("@/server/lib/prisma");

describe("dashboard.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingEvaluations", () => {
    it("returns pending evaluation sessions for the user", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([
        {
          session: {
            id: "session_1",
            title: "Q1 Eval",
            type: "SCORECARD",
            status: "ACTIVE",
            dueDate: new Date("2026-04-01"),
            campaignId: "c1",
            campaign: { id: "c1", title: "Campaign Alpha" },
            _count: { ideas: 5 },
          },
        },
      ] as never);

      vi.mocked(prisma.evaluationResponse.count).mockResolvedValue(2);

      const result = await getPendingEvaluations("user_1");

      expect(result).toHaveLength(1);
      expect(result[0].sessionId).toBe("session_1");
      expect(result[0].sessionTitle).toBe("Q1 Eval");
      expect(result[0].ideaCount).toBe(5);
      expect(result[0].respondedCount).toBe(2);
    });

    it("filters out completed sessions", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([
        {
          session: {
            id: "session_1",
            title: "Done Eval",
            type: "PAIRWISE",
            status: "COMPLETED",
            dueDate: null,
            campaignId: "c1",
            campaign: { id: "c1", title: "Campaign Alpha" },
            _count: { ideas: 3 },
          },
        },
      ] as never);

      const result = await getPendingEvaluations("user_1");

      expect(result).toHaveLength(0);
    });

    it("excludes sessions where all ideas are responded", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([
        {
          session: {
            id: "session_1",
            title: "Full Eval",
            type: "SCORECARD",
            status: "ACTIVE",
            dueDate: null,
            campaignId: "c1",
            campaign: { id: "c1", title: "Campaign Alpha" },
            _count: { ideas: 3 },
          },
        },
      ] as never);

      vi.mocked(prisma.evaluationResponse.count).mockResolvedValue(3);

      const result = await getPendingEvaluations("user_1");

      expect(result).toHaveLength(0);
    });
  });

  describe("getActiveCampaigns", () => {
    it("returns active campaigns the user is a member of", async () => {
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([
        {
          role: "CAMPAIGN_CONTRIBUTOR",
          campaign: {
            id: "c1",
            title: "Campaign Alpha",
            status: "SUBMISSION",
            submissionCloseDate: new Date("2026-04-01"),
            _count: { ideas: 10, members: 5 },
          },
        },
        {
          role: "CAMPAIGN_MANAGER",
          campaign: {
            id: "c2",
            title: "Closed Campaign",
            status: "CLOSED",
            submissionCloseDate: null,
            _count: { ideas: 20, members: 8 },
          },
        },
      ] as never);

      const result = await getActiveCampaigns("user_1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c1");
      expect(result[0].role).toBe("CAMPAIGN_CONTRIBUTOR");
      expect(result[0].ideaCount).toBe(10);
    });

    it("filters out draft and closed campaigns", async () => {
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([
        {
          role: "CAMPAIGN_MANAGER",
          campaign: {
            id: "c1",
            title: "Draft Campaign",
            status: "DRAFT",
            submissionCloseDate: null,
            _count: { ideas: 0, members: 1 },
          },
        },
      ] as never);

      const result = await getActiveCampaigns("user_1");

      expect(result).toHaveLength(0);
    });
  });

  describe("getRecentIdeas", () => {
    it("returns recent ideas contributed by the user", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([
        {
          id: "idea_1",
          title: "Great Idea",
          status: "COMMUNITY_DISCUSSION",
          campaignId: "c1",
          campaign: { title: "Campaign Alpha" },
          createdAt: new Date("2026-03-10"),
          _count: { likes: 3, comments: 7 },
        },
      ] as never);

      const result = await getRecentIdeas("user_1");

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Great Idea");
      expect(result[0].likesCount).toBe(3);
      expect(result[0].commentsCount).toBe(7);
    });

    it("returns empty array when user has no ideas", async () => {
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);

      const result = await getRecentIdeas("user_1");

      expect(result).toHaveLength(0);
    });
  });

  describe("getActivityFeed", () => {
    it("returns activity across user campaigns with cursor pagination", async () => {
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([
        { campaignId: "c1" },
        { campaignId: "c2" },
      ] as never);

      vi.mocked(prisma.activityEvent.findMany).mockResolvedValue([
        {
          id: "evt_1",
          ideaId: "idea_1",
          campaignId: "c1",
          actorId: "user_2",
          eventType: "IDEA_SUBMITTED",
          title: "submitted an idea",
          body: null,
          createdAt: new Date("2026-03-10"),
          actor: { id: "user_2", name: "Jane", email: "jane@test.com", image: null },
        },
      ] as never);

      const result = await getActivityFeed("user_1", 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("submitted an idea");
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns empty when user has no campaign memberships", async () => {
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([]);

      const result = await getActivityFeed("user_1", 10);

      expect(result.items).toHaveLength(0);
    });

    it("handles cursor-based pagination with next cursor", async () => {
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ campaignId: "c1" }] as never);

      const events = Array.from({ length: 11 }, (_, i) => ({
        id: `evt_${i}`,
        ideaId: "idea_1",
        campaignId: "c1",
        actorId: "user_2",
        eventType: "IDEA_SUBMITTED",
        title: "submitted an idea",
        body: null,
        createdAt: new Date(`2026-03-${String(10 - i).padStart(2, "0")}`),
        actor: { id: "user_2", name: "Jane", email: "jane@test.com", image: null },
      }));

      vi.mocked(prisma.activityEvent.findMany).mockResolvedValue(events as never);

      const result = await getActivityFeed("user_1", 10);

      expect(result.items).toHaveLength(10);
      expect(result.nextCursor).toBe("evt_10");
    });
  });

  describe("getPlatformKpis", () => {
    it("returns platform-wide KPI counts", async () => {
      vi.mocked(prisma.campaign.count).mockResolvedValue(3);
      vi.mocked(prisma.idea.count).mockResolvedValue(50);
      vi.mocked(prisma.user.count).mockResolvedValue(100);
      vi.mocked(prisma.evaluationSession.count).mockResolvedValue(2);

      const result = await getPlatformKpis();

      expect(result.activeCampaigns).toBe(3);
      expect(result.totalIdeas).toBe(50);
      expect(result.totalUsers).toBe(100);
      expect(result.pendingEvaluations).toBe(2);
    });
  });

  describe("getDashboardOverview", () => {
    it("returns full overview for a manager with KPIs", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([]);
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaign.count).mockResolvedValue(2);
      vi.mocked(prisma.idea.count).mockResolvedValue(10);
      vi.mocked(prisma.user.count).mockResolvedValue(50);
      vi.mocked(prisma.evaluationSession.count).mockResolvedValue(1);

      const result = await getDashboardOverview("user_1", "INNOVATION_MANAGER", {
        activityLimit: 10,
      });

      expect(result.userRole).toBe("INNOVATION_MANAGER");
      expect(result.platformKpis).not.toBeNull();
      expect(result.platformKpis?.activeCampaigns).toBe(2);
    });

    it("returns overview without KPIs for a regular member", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([]);
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);

      const result = await getDashboardOverview("user_1", "MEMBER", {
        activityLimit: 10,
      });

      expect(result.userRole).toBe("MEMBER");
      expect(result.platformKpis).toBeNull();
    });

    it("returns overview with KPIs for platform admin", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([]);
      vi.mocked(prisma.idea.findMany).mockResolvedValue([]);
      vi.mocked(prisma.campaign.count).mockResolvedValue(5);
      vi.mocked(prisma.idea.count).mockResolvedValue(100);
      vi.mocked(prisma.user.count).mockResolvedValue(200);
      vi.mocked(prisma.evaluationSession.count).mockResolvedValue(3);

      const result = await getDashboardOverview("user_1", "PLATFORM_ADMIN", {
        activityLimit: 10,
      });

      expect(result.platformKpis).not.toBeNull();
      expect(result.platformKpis?.totalUsers).toBe(200);
    });
  });
});
