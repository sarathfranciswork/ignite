import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignSiaService } from "../campaign-sia.service";

// ============================================================
// Campaign-SIA Service Tests (Story 9.6)
// ============================================================

// Mock PrismaClient with chained methods
function createMockDb() {
  return {
    campaign: {
      findUnique: vi.fn(),
    },
    strategicInnovationArea: {
      findMany: vi.fn(),
    },
    campaignSiaLink: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
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
    ideaTrendLink: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

describe("CampaignSiaService", () => {
  let db: MockDb;
  let service: CampaignSiaService;

  beforeEach(() => {
    db = createMockDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new CampaignSiaService(db as any);
  });

  describe("linkCampaignToSias", () => {
    it("links campaign to valid SIAs", async () => {
      db.campaign.findUnique.mockResolvedValue({ id: "campaign-1" });
      db.strategicInnovationArea.findMany.mockResolvedValue([
        { id: "sia-1" },
        { id: "sia-2" },
      ]);
      db.$transaction.mockResolvedValue([{ id: "link-1" }, { id: "link-2" }]);

      const result = await service.linkCampaignToSias("campaign-1", [
        "sia-1",
        "sia-2",
      ]);

      expect(result).toEqual({ linked: 2 });
      expect(db.campaign.findUnique).toHaveBeenCalledWith({
        where: { id: "campaign-1" },
      });
      expect(db.strategicInnovationArea.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["sia-1", "sia-2"] }, isActive: true },
        select: { id: true },
      });
    });

    it("throws error if campaign not found", async () => {
      db.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.linkCampaignToSias("nonexistent", ["sia-1"]),
      ).rejects.toThrow("Campaign not found: nonexistent");
    });

    it("throws error for invalid SIA IDs", async () => {
      db.campaign.findUnique.mockResolvedValue({ id: "campaign-1" });
      db.strategicInnovationArea.findMany.mockResolvedValue([{ id: "sia-1" }]);

      await expect(
        service.linkCampaignToSias("campaign-1", ["sia-1", "invalid-id"]),
      ).rejects.toThrow("Invalid or inactive SIA IDs: invalid-id");
    });
  });

  describe("unlinkCampaignSia", () => {
    it("deletes the campaign-SIA link", async () => {
      db.campaignSiaLink.delete.mockResolvedValue({ id: "link-1" });

      await service.unlinkCampaignSia("campaign-1", "sia-1");

      expect(db.campaignSiaLink.delete).toHaveBeenCalledWith({
        where: {
          campaignId_siaId: { campaignId: "campaign-1", siaId: "sia-1" },
        },
      });
    });
  });

  describe("getCampaignSias", () => {
    it("returns linked SIAs", async () => {
      const mockSias = [
        {
          sia: {
            id: "sia-1",
            name: "AI & ML",
            description: "Artificial Intelligence",
            imageUrl: null,
          },
        },
        {
          sia: {
            id: "sia-2",
            name: "IoT",
            description: "Internet of Things",
            imageUrl: null,
          },
        },
      ];
      db.campaignSiaLink.findMany.mockResolvedValue(mockSias);

      const result = await service.getCampaignSias("campaign-1");

      expect(result).toEqual([
        {
          id: "sia-1",
          name: "AI & ML",
          description: "Artificial Intelligence",
          imageUrl: null,
        },
        {
          id: "sia-2",
          name: "IoT",
          description: "Internet of Things",
          imageUrl: null,
        },
      ]);
    });
  });

  describe("getBeInspiredContent", () => {
    it("returns empty content when no SIA links", async () => {
      db.campaignSiaLink.findMany.mockResolvedValue([]);

      const result = await service.getBeInspiredContent("campaign-1");

      expect(result).toEqual({
        sias: [],
        trends: [],
        technologies: [],
        insights: [],
        hasSiaLinks: false,
      });
    });

    it("returns aggregated content from linked SIAs", async () => {
      db.campaignSiaLink.findMany.mockResolvedValue([
        {
          sia: {
            id: "sia-1",
            name: "AI & ML",
            description: "Artificial Intelligence",
            imageUrl: null,
          },
        },
      ]);

      db.trendSiaLink.findMany.mockResolvedValue([
        {
          trend: {
            id: "trend-1",
            title: "LLMs",
            description: "Large Language Models",
            imageUrl: null,
            type: "MACRO",
            businessRelevance: 0.9,
            isArchived: false,
            isConfidential: false,
          },
          sia: { name: "AI & ML" },
        },
      ]);

      db.techSiaLink.findMany.mockResolvedValue([
        {
          tech: {
            id: "tech-1",
            title: "GPT-5",
            description: "Next-gen model",
            imageUrl: null,
            maturityLevel: "Growth",
            isArchived: false,
            isConfidential: false,
          },
          sia: { name: "AI & ML" },
        },
      ]);

      db.trendInsightLink.findMany.mockResolvedValue([
        {
          insight: {
            id: "insight-1",
            title: "Enterprise AI adoption",
            description: "Growing fast",
            imageUrl: null,
            sourceUrl: "https://example.com",
          },
          trend: { title: "LLMs" },
        },
      ]);

      const result = await service.getBeInspiredContent("campaign-1");

      expect(result.hasSiaLinks).toBe(true);
      expect(result.sias).toHaveLength(1);
      expect(result.sias[0].name).toBe("AI & ML");
      expect(result.trends).toHaveLength(1);
      expect(result.trends[0].title).toBe("LLMs");
      expect(result.technologies).toHaveLength(1);
      expect(result.technologies[0].title).toBe("GPT-5");
      expect(result.insights).toHaveLength(1);
      expect(result.insights[0].title).toBe("Enterprise AI adoption");
    });

    it("filters out archived and confidential items", async () => {
      db.campaignSiaLink.findMany.mockResolvedValue([
        {
          sia: {
            id: "sia-1",
            name: "AI",
            description: null,
            imageUrl: null,
          },
        },
      ]);

      db.trendSiaLink.findMany.mockResolvedValue([
        {
          trend: {
            id: "trend-archived",
            title: "Archived Trend",
            description: null,
            imageUrl: null,
            type: "MICRO",
            businessRelevance: null,
            isArchived: true,
            isConfidential: false,
          },
          sia: { name: "AI" },
        },
        {
          trend: {
            id: "trend-confidential",
            title: "Confidential Trend",
            description: null,
            imageUrl: null,
            type: "MICRO",
            businessRelevance: null,
            isArchived: false,
            isConfidential: true,
          },
          sia: { name: "AI" },
        },
        {
          trend: {
            id: "trend-visible",
            title: "Visible Trend",
            description: null,
            imageUrl: null,
            type: "MICRO",
            businessRelevance: null,
            isArchived: false,
            isConfidential: false,
          },
          sia: { name: "AI" },
        },
      ]);

      db.techSiaLink.findMany.mockResolvedValue([]);
      db.trendInsightLink.findMany.mockResolvedValue([]);

      const result = await service.getBeInspiredContent("campaign-1");

      expect(result.trends).toHaveLength(1);
      expect(result.trends[0].id).toBe("trend-visible");
    });

    it("deduplicates items linked to multiple SIAs", async () => {
      db.campaignSiaLink.findMany.mockResolvedValue([
        {
          sia: {
            id: "sia-1",
            name: "AI",
            description: null,
            imageUrl: null,
          },
        },
        {
          sia: {
            id: "sia-2",
            name: "Data",
            description: null,
            imageUrl: null,
          },
        },
      ]);

      db.trendSiaLink.findMany.mockResolvedValue([
        {
          trend: {
            id: "trend-shared",
            title: "Shared Trend",
            description: null,
            imageUrl: null,
            type: "MACRO",
            businessRelevance: null,
            isArchived: false,
            isConfidential: false,
          },
          sia: { name: "AI" },
        },
        {
          trend: {
            id: "trend-shared",
            title: "Shared Trend",
            description: null,
            imageUrl: null,
            type: "MACRO",
            businessRelevance: null,
            isArchived: false,
            isConfidential: false,
          },
          sia: { name: "Data" },
        },
      ]);

      db.techSiaLink.findMany.mockResolvedValue([]);
      db.trendInsightLink.findMany.mockResolvedValue([]);

      const result = await service.getBeInspiredContent("campaign-1");

      expect(result.trends).toHaveLength(1);
    });
  });

  describe("hasSiaLinks", () => {
    it("returns true when campaign has SIA links", async () => {
      db.campaignSiaLink.count.mockResolvedValue(2);

      const result = await service.hasSiaLinks("campaign-1");

      expect(result).toBe(true);
    });

    it("returns false when campaign has no SIA links", async () => {
      db.campaignSiaLink.count.mockResolvedValue(0);

      const result = await service.hasSiaLinks("campaign-1");

      expect(result).toBe(false);
    });
  });

  describe("linkIdeaToTrend", () => {
    it("creates idea-trend link via upsert", async () => {
      db.ideaTrendLink.upsert.mockResolvedValue({ id: "link-1" });

      await service.linkIdeaToTrend("idea-1", "trend-1");

      expect(db.ideaTrendLink.upsert).toHaveBeenCalledWith({
        where: {
          ideaId_trendId: { ideaId: "idea-1", trendId: "trend-1" },
        },
        create: { ideaId: "idea-1", trendId: "trend-1" },
        update: {},
      });
    });
  });

  describe("unlinkIdeaTrend", () => {
    it("deletes idea-trend link", async () => {
      db.ideaTrendLink.delete.mockResolvedValue({ id: "link-1" });

      await service.unlinkIdeaTrend("idea-1", "trend-1");

      expect(db.ideaTrendLink.delete).toHaveBeenCalledWith({
        where: {
          ideaId_trendId: { ideaId: "idea-1", trendId: "trend-1" },
        },
      });
    });
  });

  describe("setCampaignSias", () => {
    it("replaces all SIA links", async () => {
      db.campaign.findUnique.mockResolvedValue({ id: "campaign-1" });
      db.$transaction.mockResolvedValue([]);

      const result = await service.setCampaignSias("campaign-1", [
        "sia-1",
        "sia-2",
      ]);

      expect(result).toEqual({ linked: 2 });
      expect(db.$transaction).toHaveBeenCalled();
    });

    it("throws error if campaign not found", async () => {
      db.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.setCampaignSias("nonexistent", ["sia-1"]),
      ).rejects.toThrow("Campaign not found: nonexistent");
    });
  });
});
