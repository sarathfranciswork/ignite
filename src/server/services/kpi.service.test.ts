import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getCampaignCockpit,
  getCampaignActivity,
  exportCockpitData,
  createKpiSnapshot,
  KpiServiceError,
} from "./kpi.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    campaignMember: {
      count: vi.fn(),
    },
    kpiSnapshot: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
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
const campaignMemberCount = prisma.campaignMember.count as unknown as Mock;
const kpiSnapshotFindFirst = prisma.kpiSnapshot.findFirst as unknown as Mock;
const kpiSnapshotFindMany = prisma.kpiSnapshot.findMany as unknown as Mock;
const kpiSnapshotUpsert = prisma.kpiSnapshot.upsert as unknown as Mock;
const eventBusEmit = eventBus.emit as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("kpi.service", () => {
  describe("getCampaignCockpit", () => {
    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      campaignFindUnique.mockResolvedValue(null);

      await expect(getCampaignCockpit({ campaignId: "nonexistent" })).rejects.toThrow(
        KpiServiceError,
      );
      await expect(getCampaignCockpit({ campaignId: "nonexistent" })).rejects.toThrow(
        "Campaign not found",
      );
    });

    it("returns data from latest snapshot when available", async () => {
      campaignFindUnique.mockResolvedValue({ id: "campaign-1" });
      kpiSnapshotFindFirst.mockResolvedValue({
        invitedCount: 100,
        browsedCount: 60,
        participantCount: 30,
        ideaCount: 15,
        commentCount: 45,
        voteCount: 200,
        likeCount: 80,
        submittedCount: 15,
        qualifiedCount: 10,
        hotCount: 5,
        evaluatedCount: 3,
        selectedCount: 2,
      });

      const result = await getCampaignCockpit({ campaignId: "campaign-1" });

      expect(result.kpis.awarenessRate).toBe(60);
      expect(result.kpis.participationRate).toBe(30);
      expect(result.kpis.ideaCount).toBe(15);
      expect(result.funnel).toHaveLength(5);
      expect(result.funnel[0]).toEqual({ stage: "Submitted", count: 15 });
      expect(result.funnel[4]).toEqual({ stage: "Selected", count: 2 });
    });

    it("returns fallback real-time counters when no snapshot exists", async () => {
      campaignFindUnique.mockResolvedValue({ id: "campaign-1" });
      kpiSnapshotFindFirst.mockResolvedValue(null);
      campaignMemberCount.mockResolvedValue(50);

      const result = await getCampaignCockpit({ campaignId: "campaign-1" });

      expect(result.kpis.invitedCount).toBe(50);
      expect(result.kpis.ideaCount).toBe(0);
      expect(result.kpis.awarenessRate).toBe(0);
      expect(result.funnel).toHaveLength(5);
    });

    it("handles zero invited count without division by zero", async () => {
      campaignFindUnique.mockResolvedValue({ id: "campaign-1" });
      kpiSnapshotFindFirst.mockResolvedValue({
        invitedCount: 0,
        browsedCount: 0,
        participantCount: 0,
        ideaCount: 0,
        commentCount: 0,
        voteCount: 0,
        likeCount: 0,
        submittedCount: 0,
        qualifiedCount: 0,
        hotCount: 0,
        evaluatedCount: 0,
        selectedCount: 0,
      });

      const result = await getCampaignCockpit({ campaignId: "campaign-1" });

      expect(result.kpis.awarenessRate).toBe(0);
      expect(result.kpis.participationRate).toBe(0);
    });
  });

  describe("getCampaignActivity", () => {
    it("returns empty array when no snapshots exist", async () => {
      kpiSnapshotFindMany.mockResolvedValue([]);

      const result = await getCampaignActivity({ campaignId: "campaign-1", days: 30 });

      expect(result).toEqual([]);
    });

    it("returns daily activity data points from snapshots", async () => {
      kpiSnapshotFindMany.mockResolvedValue([
        {
          snapshotDate: new Date("2026-03-01"),
          ideaCount: 5,
          commentCount: 10,
          voteCount: 20,
        },
        {
          snapshotDate: new Date("2026-03-02"),
          ideaCount: 8,
          commentCount: 18,
          voteCount: 35,
        },
      ]);

      const result = await getCampaignActivity({ campaignId: "campaign-1", days: 30 });

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe("2026-03-01");
      expect(result[0].ideas).toBe(5); // First day uses absolute count
      expect(result[1].ideas).toBe(3); // Delta from previous day
      expect(result[1].comments).toBe(8);
      expect(result[1].votes).toBe(15);
    });
  });

  describe("exportCockpitData", () => {
    it("returns formatted export rows from all snapshots", async () => {
      kpiSnapshotFindMany.mockResolvedValue([
        {
          snapshotDate: new Date("2026-03-01"),
          invitedCount: 100,
          browsedCount: 60,
          participantCount: 30,
          ideaCount: 5,
          commentCount: 10,
          voteCount: 20,
          likeCount: 15,
          submittedCount: 5,
          qualifiedCount: 3,
          hotCount: 2,
          evaluatedCount: 1,
          selectedCount: 0,
        },
      ]);

      const result = await exportCockpitData({ campaignId: "campaign-1" });

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-03-01");
      expect(result[0].invitedCount).toBe(100);
      expect(result[0].selectedCount).toBe(0);
    });
  });

  describe("createKpiSnapshot", () => {
    it("creates a snapshot with campaign member count", async () => {
      campaignMemberCount.mockResolvedValue(42);
      kpiSnapshotUpsert.mockResolvedValue({
        id: "snapshot-1",
        campaignId: "campaign-1",
      });

      await createKpiSnapshot("campaign-1");

      expect(kpiSnapshotUpsert).toHaveBeenCalledTimes(1);
      expect(campaignMemberCount).toHaveBeenCalledWith({
        where: { campaignId: "campaign-1" },
      });
    });

    it("emits kpi.snapshotCreated event after creation", async () => {
      campaignMemberCount.mockResolvedValue(10);
      kpiSnapshotUpsert.mockResolvedValue({
        id: "snapshot-1",
        campaignId: "campaign-1",
      });

      await createKpiSnapshot("campaign-1");

      expect(eventBusEmit).toHaveBeenCalledWith(
        "kpi.snapshotCreated",
        expect.objectContaining({
          entity: "kpiSnapshot",
          entityId: "snapshot-1",
          actor: "system:kpi-snapshot",
        }),
      );
    });
  });
});
