import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCampaignKpis,
  getCampaignKpiTimeSeries,
  takeCampaignKpiSnapshot,
  KpiServiceError,
} from "./kpi.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    campaignKpiSnapshot: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

const { prisma } = await import("@/server/lib/prisma");

describe("kpi.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCampaignKpis", () => {
    it("returns KPIs for a campaign", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "c1",
        _count: { members: 5 },
      } as never);

      const kpis = await getCampaignKpis("c1");

      expect(kpis.campaignId).toBe("c1");
      expect(kpis.memberCount).toBe(5);
      expect(kpis.participationRate).toBe(100);
    });

    it("throws CAMPAIGN_NOT_FOUND when campaign does not exist", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      await expect(getCampaignKpis("missing")).rejects.toThrow(KpiServiceError);
    });

    it("returns zero participation rate when no members", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "c1",
        _count: { members: 0 },
      } as never);

      const kpis = await getCampaignKpis("c1");

      expect(kpis.participationRate).toBe(0);
    });
  });

  describe("getCampaignKpiTimeSeries", () => {
    it("returns time series data from snapshots", async () => {
      vi.mocked(prisma.campaignKpiSnapshot.findMany).mockResolvedValue([
        {
          snapshotDate: new Date("2026-03-01"),
          ideasSubmitted: 5,
          totalComments: 10,
          totalVotes: 20,
        },
        {
          snapshotDate: new Date("2026-03-02"),
          ideasSubmitted: 8,
          totalComments: 15,
          totalVotes: 25,
        },
      ] as never);

      const series = await getCampaignKpiTimeSeries("c1", 30);

      expect(series).toHaveLength(2);
      expect(series[0].date).toBe("2026-03-01");
      expect(series[0].ideasSubmitted).toBe(5);
      expect(series[1].ideasSubmitted).toBe(8);
    });

    it("returns empty array when no snapshots", async () => {
      vi.mocked(prisma.campaignKpiSnapshot.findMany).mockResolvedValue([]);

      const series = await getCampaignKpiTimeSeries("c1");

      expect(series).toHaveLength(0);
    });
  });

  describe("takeCampaignKpiSnapshot", () => {
    it("upserts a snapshot for today", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "c1",
        _count: { members: 3 },
      } as never);
      vi.mocked(prisma.campaignKpiSnapshot.upsert).mockResolvedValue({} as never);

      await takeCampaignKpiSnapshot("c1");

      expect(prisma.campaignKpiSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            campaignId_snapshotDate: expect.objectContaining({
              campaignId: "c1",
            }),
          }),
        }),
      );
    });
  });
});
