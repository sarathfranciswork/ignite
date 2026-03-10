import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { processKpiSnapshots } from "./kpi-snapshot.job";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findMany: vi.fn(),
    },
    campaignMember: {
      count: vi.fn(),
    },
    kpiSnapshot: {
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

const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const campaignMemberCount = (prisma.campaignMember as unknown as { count: Mock }).count;
const kpiSnapshotUpsert = (prisma.kpiSnapshot as unknown as { upsert: Mock }).upsert;

beforeEach(() => {
  vi.clearAllMocks();
  campaignMemberCount.mockResolvedValue(10);
  kpiSnapshotUpsert.mockResolvedValue({ id: "snapshot-1", campaignId: "c1" });
});

describe("kpi-snapshot.job", () => {
  describe("processKpiSnapshots", () => {
    it("returns 0 when no active campaigns exist", async () => {
      campaignFindMany.mockResolvedValue([]);

      const result = await processKpiSnapshots();
      expect(result).toBe(0);
    });

    it("creates snapshots for active campaigns (non-DRAFT, non-CLOSED)", async () => {
      campaignFindMany.mockResolvedValue([
        { id: "c1", title: "Campaign 1" },
        { id: "c2", title: "Campaign 2" },
      ]);

      const result = await processKpiSnapshots();

      expect(result).toBe(2);
      expect(kpiSnapshotUpsert).toHaveBeenCalledTimes(2);
    });

    it("continues processing when one snapshot fails", async () => {
      campaignFindMany.mockResolvedValue([
        { id: "c1", title: "Campaign 1" },
        { id: "c2", title: "Campaign 2" },
      ]);

      campaignMemberCount.mockRejectedValueOnce(new Error("DB error")).mockResolvedValueOnce(5);

      const result = await processKpiSnapshots();

      expect(result).toBe(1);
    });
  });
});
