import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  linkCampaignToSias,
  unlinkCampaignFromSia,
  getCampaignSias,
  getBeInspiredContent,
  BeInspiredServiceError,
} from "./be-inspired.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(),
    },
    strategicInnovationArea: {
      findMany: vi.fn(),
    },
    campaignSiaLink: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    trendSiaLink: {
      findMany: vi.fn(),
    },
    techSiaLink: {
      findMany: vi.fn(),
    },
    trendInsightLink: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fns: Array<Promise<unknown>>) => Promise.all(fns)),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
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
const siaFindMany = prisma.strategicInnovationArea.findMany as unknown as Mock;
const campaignSiaLinkFindUnique = prisma.campaignSiaLink.findUnique as unknown as Mock;
const campaignSiaLinkFindMany = prisma.campaignSiaLink.findMany as unknown as Mock;
const _campaignSiaLinkUpsert = prisma.campaignSiaLink.upsert as unknown as Mock;
const campaignSiaLinkDelete = prisma.campaignSiaLink.delete as unknown as Mock;
const trendSiaLinkFindMany = prisma.trendSiaLink.findMany as unknown as Mock;
const techSiaLinkFindMany = prisma.techSiaLink.findMany as unknown as Mock;
const trendInsightLinkFindMany = prisma.trendInsightLink.findMany as unknown as Mock;
const $transaction = prisma.$transaction as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("linkCampaignToSias", () => {
  it("links a campaign to SIAs", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1", title: "Test Campaign" });
    siaFindMany.mockResolvedValue([
      { id: "sia-1", name: "SIA One" },
      { id: "sia-2", name: "SIA Two" },
    ]);
    $transaction.mockResolvedValue([
      { id: "link-1", campaignId: "camp-1", siaId: "sia-1" },
      { id: "link-2", campaignId: "camp-1", siaId: "sia-2" },
    ]);

    const result = await linkCampaignToSias(
      { campaignId: "camp-1", siaIds: ["sia-1", "sia-2"] },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(result.linkedCount).toBe(2);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.campaignLinked",
      expect.objectContaining({
        entity: "sia",
        entityId: "sia-1",
        actor: "user-1",
      }),
    );
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      linkCampaignToSias({ campaignId: "camp-missing", siaIds: ["sia-1"] }, "user-1"),
    ).rejects.toThrow(BeInspiredServiceError);
  });

  it("throws when no active SIAs found", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1", title: "Test" });
    siaFindMany.mockResolvedValue([]);

    await expect(
      linkCampaignToSias({ campaignId: "camp-1", siaIds: ["sia-missing"] }, "user-1"),
    ).rejects.toThrow("No active SIAs found");
  });
});

describe("unlinkCampaignFromSia", () => {
  it("removes an existing link", async () => {
    campaignSiaLinkFindUnique.mockResolvedValue({
      id: "link-1",
      campaignId: "camp-1",
      siaId: "sia-1",
      campaign: { title: "Test Campaign" },
    });
    campaignSiaLinkDelete.mockResolvedValue({});

    const result = await unlinkCampaignFromSia({ campaignId: "camp-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(campaignSiaLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.campaignUnlinked",
      expect.objectContaining({
        entity: "sia",
        entityId: "sia-1",
      }),
    );
  });

  it("returns success when link does not exist", async () => {
    campaignSiaLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkCampaignFromSia({ campaignId: "camp-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(campaignSiaLinkDelete).not.toHaveBeenCalled();
  });
});

describe("getCampaignSias", () => {
  it("returns linked SIAs for a campaign", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1" });
    campaignSiaLinkFindMany.mockResolvedValue([
      {
        sia: {
          id: "sia-1",
          name: "SIA One",
          description: "Desc 1",
          color: "#FF0000",
          bannerUrl: null,
          isActive: true,
        },
      },
    ]);

    const result = await getCampaignSias("camp-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ id: "sia-1", name: "SIA One" }));
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(getCampaignSias("camp-missing")).rejects.toThrow(BeInspiredServiceError);
  });
});

describe("getBeInspiredContent", () => {
  it("returns empty when no SIAs linked", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1" });
    campaignSiaLinkFindMany.mockResolvedValue([]);

    const result = await getBeInspiredContent({ campaignId: "camp-1" });

    expect(result.sias).toEqual([]);
    expect(result.trends).toEqual([]);
    expect(result.technologies).toEqual([]);
    expect(result.insights).toEqual([]);
  });

  it("returns aggregated content from linked SIAs", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1" });
    campaignSiaLinkFindMany.mockResolvedValue([{ siaId: "sia-1" }]);

    siaFindMany.mockResolvedValue([
      {
        id: "sia-1",
        name: "Digital",
        description: "Digital transformation",
        color: "#6366F1",
        bannerUrl: null,
      },
    ]);

    trendSiaLinkFindMany.mockResolvedValue([
      {
        trend: {
          id: "trend-1",
          title: "AI Revolution",
          description: "AI is growing",
          imageUrl: null,
          sourceUrl: null,
          type: "MEGA",
          isArchived: false,
        },
      },
    ]);

    techSiaLinkFindMany.mockResolvedValue([
      {
        tech: {
          id: "tech-1",
          title: "Quantum Computing",
          description: "Next gen computing",
          imageUrl: null,
          sourceUrl: null,
          maturityLevel: "EMERGING",
          isArchived: false,
        },
      },
    ]);

    trendInsightLinkFindMany.mockResolvedValue([
      {
        insight: {
          id: "insight-1",
          title: "Market Signal",
          description: "Strong market signal",
          type: "SIGNAL",
          scope: "GLOBAL",
          sourceUrl: null,
          isArchived: false,
        },
      },
    ]);

    const result = await getBeInspiredContent({ campaignId: "camp-1" });

    expect(result.sias).toHaveLength(1);
    expect(result.sias[0]).toEqual(expect.objectContaining({ id: "sia-1", name: "Digital" }));
    expect(result.trends).toHaveLength(1);
    expect(result.trends[0]).toEqual(
      expect.objectContaining({ id: "trend-1", title: "AI Revolution" }),
    );
    expect(result.technologies).toHaveLength(1);
    expect(result.technologies[0]).toEqual(
      expect.objectContaining({ id: "tech-1", title: "Quantum Computing" }),
    );
    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]).toEqual(
      expect.objectContaining({ id: "insight-1", title: "Market Signal" }),
    );
  });

  it("filters out archived trends", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1" });
    campaignSiaLinkFindMany.mockResolvedValue([{ siaId: "sia-1" }]);
    siaFindMany.mockResolvedValue([
      { id: "sia-1", name: "SIA", description: null, color: null, bannerUrl: null },
    ]);

    trendSiaLinkFindMany.mockResolvedValue([
      {
        trend: {
          id: "trend-archived",
          title: "Old Trend",
          description: null,
          imageUrl: null,
          sourceUrl: null,
          type: "MICRO",
          isArchived: true,
        },
      },
    ]);
    techSiaLinkFindMany.mockResolvedValue([]);

    const result = await getBeInspiredContent({ campaignId: "camp-1" });

    expect(result.trends).toHaveLength(0);
  });

  it("deduplicates trends linked to multiple SIAs", async () => {
    campaignFindUnique.mockResolvedValue({ id: "camp-1" });
    campaignSiaLinkFindMany.mockResolvedValue([{ siaId: "sia-1" }, { siaId: "sia-2" }]);
    siaFindMany.mockResolvedValue([
      { id: "sia-1", name: "SIA 1", description: null, color: null, bannerUrl: null },
      { id: "sia-2", name: "SIA 2", description: null, color: null, bannerUrl: null },
    ]);

    const sharedTrend = {
      id: "trend-shared",
      title: "Shared Trend",
      description: null,
      imageUrl: null,
      sourceUrl: null,
      type: "MACRO",
      isArchived: false,
    };

    trendSiaLinkFindMany.mockResolvedValue([{ trend: sharedTrend }, { trend: sharedTrend }]);
    techSiaLinkFindMany.mockResolvedValue([]);

    const result = await getBeInspiredContent({ campaignId: "camp-1" });

    expect(result.trends).toHaveLength(1);
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(getBeInspiredContent({ campaignId: "camp-missing" })).rejects.toThrow(
      BeInspiredServiceError,
    );
  });
});
