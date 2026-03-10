import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createCampaign,
  getCampaignById,
  listCampaigns,
  updateCampaign,
  deleteCampaign,
  transitionCampaign,
  CampaignServiceError,
} from "./campaign.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const campaignCreate = prisma.campaign.create as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignFindMany = prisma.campaign.findMany as unknown as Mock;
const campaignUpdate = prisma.campaign.update as unknown as Mock;
const campaignDelete = prisma.campaign.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const eventBusEmit = eventBus.emit as unknown as Mock;

const MOCK_CAMPAIGN = {
  id: "campaign-1",
  title: "Test Campaign",
  description: "A test campaign",
  teaser: null,
  bannerUrl: null,
  status: "DRAFT",
  previousStatus: null,
  startDate: new Date("2026-04-01"),
  endDate: new Date("2026-06-01"),
  sponsorId: null,
  tags: [],
  isConfidential: false,
  settings: {},
  createdById: "user-1",
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
  sponsor: null,
  createdBy: { id: "user-1", name: "Test User", email: "test@example.com", image: null },
};

describe("campaign.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCampaign", () => {
    it("creates a campaign in DRAFT status", async () => {
      campaignCreate.mockResolvedValueOnce(MOCK_CAMPAIGN);

      const result = await createCampaign(
        { title: "Test Campaign", description: "A test campaign" },
        "user-1",
      );

      expect(result.id).toBe("campaign-1");
      expect(result.title).toBe("Test Campaign");
      expect(campaignCreate).toHaveBeenCalledOnce();
      expect(eventBusEmit).toHaveBeenCalledWith(
        "campaign.created",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-1",
          actor: "user-1",
        }),
      );
    });

    it("validates end date is after start date", async () => {
      await expect(
        createCampaign(
          {
            title: "Test",
            startDate: "2026-06-01T00:00:00.000Z",
            endDate: "2026-04-01T00:00:00.000Z",
          },
          "user-1",
        ),
      ).rejects.toThrow(CampaignServiceError);
    });

    it("validates sponsor exists and is active", async () => {
      userFindUnique.mockResolvedValueOnce(null);

      await expect(
        createCampaign({ title: "Test", sponsorId: "nonexistent" }, "user-1"),
      ).rejects.toThrow(CampaignServiceError);
    });

    it("allows sponsor that exists and is active", async () => {
      userFindUnique.mockResolvedValueOnce({ id: "sponsor-1", isActive: true });
      campaignCreate.mockResolvedValueOnce({
        ...MOCK_CAMPAIGN,
        sponsorId: "sponsor-1",
      });

      const result = await createCampaign({ title: "Test", sponsorId: "sponsor-1" }, "user-1");

      expect(result.sponsorId).toBe("sponsor-1");
    });
  });

  describe("getCampaignById", () => {
    it("returns campaign when found", async () => {
      campaignFindUnique.mockResolvedValueOnce(MOCK_CAMPAIGN);

      const result = await getCampaignById("campaign-1");
      expect(result.id).toBe("campaign-1");
    });

    it("throws when campaign not found", async () => {
      campaignFindUnique.mockResolvedValueOnce(null);

      await expect(getCampaignById("nonexistent")).rejects.toThrow(CampaignServiceError);
    });
  });

  describe("listCampaigns", () => {
    it("returns paginated campaigns", async () => {
      campaignFindMany.mockResolvedValueOnce([MOCK_CAMPAIGN]);

      const result = await listCampaigns({ limit: 20 });
      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });

    it("returns nextCursor when there are more items", async () => {
      const campaigns = Array.from({ length: 3 }, (_, i) => ({
        ...MOCK_CAMPAIGN,
        id: `campaign-${i}`,
      }));
      campaignFindMany.mockResolvedValueOnce(campaigns);

      const result = await listCampaigns({ limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe("campaign-2");
    });

    it("filters by status", async () => {
      campaignFindMany.mockResolvedValueOnce([]);

      await listCampaigns({ limit: 20, status: "DRAFT" });
      expect(campaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "DRAFT" }),
        }),
      );
    });

    it("filters by search", async () => {
      campaignFindMany.mockResolvedValueOnce([]);

      await listCampaigns({ limit: 20, search: "innovation" });
      expect(campaignFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: "innovation", mode: "insensitive" } }),
            ]),
          }),
        }),
      );
    });
  });

  describe("updateCampaign", () => {
    it("updates campaign fields", async () => {
      campaignFindUnique.mockResolvedValueOnce({ id: "campaign-1", status: "DRAFT" });
      campaignUpdate.mockResolvedValueOnce({ ...MOCK_CAMPAIGN, title: "Updated Title" });

      const result = await updateCampaign({ id: "campaign-1", title: "Updated Title" }, "user-1");

      expect(result.title).toBe("Updated Title");
      expect(eventBusEmit).toHaveBeenCalledWith(
        "campaign.updated",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-1",
        }),
      );
    });

    it("throws when campaign not found", async () => {
      campaignFindUnique.mockResolvedValueOnce(null);

      await expect(updateCampaign({ id: "nonexistent", title: "Test" }, "user-1")).rejects.toThrow(
        CampaignServiceError,
      );
    });
  });

  describe("deleteCampaign", () => {
    it("deletes draft campaign", async () => {
      campaignFindUnique.mockResolvedValueOnce({
        id: "campaign-1",
        status: "DRAFT",
        title: "Test",
      });
      campaignDelete.mockResolvedValueOnce({});

      await deleteCampaign("campaign-1", "user-1");
      expect(campaignDelete).toHaveBeenCalledWith({ where: { id: "campaign-1" } });
      expect(eventBusEmit).toHaveBeenCalledWith(
        "campaign.deleted",
        expect.objectContaining({
          entity: "campaign",
          entityId: "campaign-1",
        }),
      );
    });

    it("throws when campaign not found", async () => {
      campaignFindUnique.mockResolvedValueOnce(null);

      await expect(deleteCampaign("nonexistent", "user-1")).rejects.toThrow(CampaignServiceError);
    });

    it("throws when campaign is not in DRAFT status", async () => {
      campaignFindUnique.mockResolvedValueOnce({
        id: "campaign-1",
        status: "SUBMISSION",
        title: "Test",
      });

      await expect(deleteCampaign("campaign-1", "user-1")).rejects.toThrow(
        "Only draft campaigns can be deleted",
      );
    });
  });

  describe("transitionCampaign", () => {
    it("transitions campaign to valid next state", async () => {
      campaignFindUnique.mockResolvedValueOnce({
        id: "campaign-1",
        status: "DRAFT",
        title: "Test",
      });
      campaignUpdate.mockResolvedValueOnce({
        ...MOCK_CAMPAIGN,
        status: "SUBMISSION",
        previousStatus: "DRAFT",
      });

      const result = await transitionCampaign({ id: "campaign-1", to: "SUBMISSION" }, "user-1");

      expect(result.status).toBe("SUBMISSION");
      expect(campaignUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "SUBMISSION",
            previousStatus: "DRAFT",
          }),
        }),
      );
      expect(eventBusEmit).toHaveBeenCalledWith(
        "campaign.phaseChanged",
        expect.objectContaining({
          entity: "campaign",
          metadata: expect.objectContaining({ from: "DRAFT", to: "SUBMISSION" }),
        }),
      );
    });

    it("throws when campaign not found", async () => {
      campaignFindUnique.mockResolvedValueOnce(null);

      await expect(
        transitionCampaign({ id: "nonexistent", to: "SUBMISSION" }, "user-1"),
      ).rejects.toThrow(CampaignServiceError);
    });

    it("throws for invalid transition", async () => {
      campaignFindUnique.mockResolvedValueOnce({
        id: "campaign-1",
        status: "DRAFT",
        title: "Test",
      });

      await expect(
        transitionCampaign({ id: "campaign-1", to: "CLOSED" }, "user-1"),
      ).rejects.toThrow("Cannot transition from DRAFT to CLOSED");
    });
  });
});
