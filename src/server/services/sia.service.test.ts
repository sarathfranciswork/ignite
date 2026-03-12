import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listSias,
  getSiaById,
  createSia,
  updateSia,
  archiveSia,
  deleteSia,
  linkCampaign,
  unlinkCampaign,
  SiaServiceError,
} from "./sia.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    strategicInnovationArea: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    campaignSia: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");

const mockSia = {
  id: "sia_1",
  name: "Sustainable Energy",
  description: "Focus on clean energy innovation",
  imageUrl: null,
  isActive: true,
  createdById: "user_1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: { id: "user_1", name: "Test User", email: "test@example.com", image: null },
  _count: { campaignLinks: 2 },
};

const mockSiaWithCampaigns = {
  ...mockSia,
  campaignLinks: [
    {
      campaign: {
        id: "camp_1",
        title: "Green Innovation",
        status: "SUBMISSION",
        teaser: "Submit green ideas",
      },
      linkedAt: new Date("2026-01-15"),
    },
  ],
};

describe("sia.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSias", () => {
    it("lists SIAs with pagination", async () => {
      vi.mocked(prisma.strategicInnovationArea.findMany).mockResolvedValue([mockSia]);

      const result = await listSias({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe("Sustainable Energy");
      expect(result.items[0].campaignCount).toBe(2);
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by isActive", async () => {
      vi.mocked(prisma.strategicInnovationArea.findMany).mockResolvedValue([]);

      await listSias({ limit: 20, isActive: true });

      expect(prisma.strategicInnovationArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it("searches by name and description", async () => {
      vi.mocked(prisma.strategicInnovationArea.findMany).mockResolvedValue([]);

      await listSias({ limit: 20, search: "energy" });

      expect(prisma.strategicInnovationArea.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: "energy", mode: "insensitive" } },
              { description: { contains: "energy", mode: "insensitive" } },
            ],
          },
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockSia,
        id: `sia_${i}`,
      }));
      vi.mocked(prisma.strategicInnovationArea.findMany).mockResolvedValue(items);

      const result = await listSias({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("sia_20");
    });
  });

  describe("getSiaById", () => {
    it("returns SIA with campaigns", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(
        mockSiaWithCampaigns as ReturnType<
          typeof prisma.strategicInnovationArea.findUnique
        > extends Promise<infer T>
          ? T
          : never,
      );

      const result = await getSiaById("sia_1");

      expect(result.name).toBe("Sustainable Energy");
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0].title).toBe("Green Innovation");
    });

    it("throws SIA_NOT_FOUND when SIA does not exist", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(null);

      await expect(getSiaById("nonexistent")).rejects.toThrow(SiaServiceError);
      await expect(getSiaById("nonexistent")).rejects.toThrow(
        "Strategic Innovation Area not found",
      );
    });
  });

  describe("createSia", () => {
    it("creates a new SIA", async () => {
      const createdSia = { ...mockSia, _count: undefined };
      vi.mocked(prisma.strategicInnovationArea.create).mockResolvedValue(createdSia);

      const result = await createSia(
        { name: "Sustainable Energy", description: "Focus on clean energy innovation" },
        "user_1",
      );

      expect(result.name).toBe("Sustainable Energy");
      expect(result.campaignCount).toBe(0);
      expect(prisma.strategicInnovationArea.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: "Sustainable Energy",
            description: "Focus on clean energy innovation",
            imageUrl: undefined,
            createdById: "user_1",
          },
        }),
      );
    });
  });

  describe("updateSia", () => {
    it("updates SIA fields", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
      } as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<infer T>
        ? T
        : never);
      vi.mocked(prisma.strategicInnovationArea.update).mockResolvedValue(mockSia);

      const result = await updateSia({ id: "sia_1", name: "Updated Name" }, "user_1");

      expect(result.name).toBe("Sustainable Energy");
      expect(prisma.strategicInnovationArea.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sia_1" },
          data: { name: "Updated Name" },
        }),
      );
    });

    it("throws SIA_NOT_FOUND when updating nonexistent SIA", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(null);

      await expect(updateSia({ id: "nonexistent", name: "Test" }, "user_1")).rejects.toThrow(
        SiaServiceError,
      );
    });
  });

  describe("archiveSia", () => {
    it("archives an active SIA", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
        isActive: true,
      } as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<infer T>
        ? T
        : never);
      vi.mocked(prisma.strategicInnovationArea.update).mockResolvedValue({
        ...mockSia,
        isActive: false,
      });

      const result = await archiveSia("sia_1", "user_1");

      expect(result.isActive).toBe(false);
    });

    it("throws ALREADY_ARCHIVED for archived SIA", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
        isActive: false,
      } as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<infer T>
        ? T
        : never);

      await expect(archiveSia("sia_1", "user_1")).rejects.toThrow("SIA is already archived");
    });

    it("throws SIA_NOT_FOUND for nonexistent SIA", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(null);

      await expect(archiveSia("nonexistent", "user_1")).rejects.toThrow(
        "Strategic Innovation Area not found",
      );
    });
  });

  describe("deleteSia", () => {
    it("deletes SIA and removes campaign links", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
        name: "Sustainable Energy",
        _count: { campaignLinks: 2 },
      } as unknown as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<
        infer T
      >
        ? T
        : never);
      vi.mocked(prisma.campaignSia.deleteMany).mockResolvedValue({ count: 2 });
      vi.mocked(prisma.strategicInnovationArea.delete).mockResolvedValue(mockSia);

      const result = await deleteSia("sia_1", "user_1");

      expect(result.success).toBe(true);
      expect(prisma.campaignSia.deleteMany).toHaveBeenCalledWith({
        where: { siaId: "sia_1" },
      });
      expect(prisma.strategicInnovationArea.delete).toHaveBeenCalledWith({
        where: { id: "sia_1" },
      });
    });

    it("throws SIA_NOT_FOUND when not found", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(null);

      await expect(deleteSia("nonexistent", "user_1")).rejects.toThrow(SiaServiceError);
    });
  });

  describe("linkCampaign", () => {
    it("links a campaign to an SIA", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
        isActive: true,
      } as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<infer T>
        ? T
        : never);
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "camp_1",
        title: "Green Innovation",
      } as ReturnType<typeof prisma.campaign.findUnique> extends Promise<infer T> ? T : never);
      vi.mocked(prisma.campaignSia.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.campaignSia.create).mockResolvedValue({
        id: "link_1",
        siaId: "sia_1",
        campaignId: "camp_1",
        linkedAt: new Date(),
        linkedBy: "user_1",
      });

      const result = await linkCampaign({ siaId: "sia_1", campaignId: "camp_1" }, "user_1");

      expect(result.siaId).toBe("sia_1");
      expect(result.campaignId).toBe("camp_1");
    });

    it("throws SIA_NOT_FOUND when SIA does not exist", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "camp_1",
        title: "Test",
      } as ReturnType<typeof prisma.campaign.findUnique> extends Promise<infer T> ? T : never);

      await expect(
        linkCampaign({ siaId: "nonexistent", campaignId: "camp_1" }, "user_1"),
      ).rejects.toThrow("Strategic Innovation Area not found");
    });

    it("throws SIA_ARCHIVED when SIA is not active", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
        isActive: false,
      } as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<infer T>
        ? T
        : never);
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "camp_1",
        title: "Test",
      } as ReturnType<typeof prisma.campaign.findUnique> extends Promise<infer T> ? T : never);

      await expect(
        linkCampaign({ siaId: "sia_1", campaignId: "camp_1" }, "user_1"),
      ).rejects.toThrow("Cannot link to an archived SIA");
    });

    it("throws ALREADY_LINKED for duplicate link", async () => {
      vi.mocked(prisma.strategicInnovationArea.findUnique).mockResolvedValue({
        id: "sia_1",
        isActive: true,
      } as ReturnType<typeof prisma.strategicInnovationArea.findUnique> extends Promise<infer T>
        ? T
        : never);
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
        id: "camp_1",
        title: "Test",
      } as ReturnType<typeof prisma.campaign.findUnique> extends Promise<infer T> ? T : never);
      vi.mocked(prisma.campaignSia.findUnique).mockResolvedValue({
        id: "link_1",
        siaId: "sia_1",
        campaignId: "camp_1",
        linkedAt: new Date(),
        linkedBy: "user_1",
      });

      await expect(
        linkCampaign({ siaId: "sia_1", campaignId: "camp_1" }, "user_1"),
      ).rejects.toThrow("Campaign is already linked to this SIA");
    });
  });

  describe("unlinkCampaign", () => {
    it("unlinks a campaign from an SIA", async () => {
      vi.mocked(prisma.campaignSia.findUnique).mockResolvedValue({
        id: "link_1",
        siaId: "sia_1",
        campaignId: "camp_1",
        linkedAt: new Date(),
        linkedBy: "user_1",
      });
      vi.mocked(prisma.campaignSia.delete).mockResolvedValue({
        id: "link_1",
        siaId: "sia_1",
        campaignId: "camp_1",
        linkedAt: new Date(),
        linkedBy: "user_1",
      });

      const result = await unlinkCampaign({ siaId: "sia_1", campaignId: "camp_1" }, "user_1");

      expect(result.success).toBe(true);
    });

    it("throws NOT_LINKED when link does not exist", async () => {
      vi.mocked(prisma.campaignSia.findUnique).mockResolvedValue(null);

      await expect(
        unlinkCampaign({ siaId: "sia_1", campaignId: "camp_1" }, "user_1"),
      ).rejects.toThrow("Campaign is not linked to this SIA");
    });
  });
});
