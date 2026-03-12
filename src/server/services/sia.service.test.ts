import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listSias,
  getSiaById,
  createSia,
  updateSia,
  deleteSia,
  linkCampaignToSia,
  unlinkCampaignFromSia,
  SiaServiceError,
} from "./sia.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    strategicInnovationArea: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        strategicInnovationArea: {
          delete: vi.fn(),
        },
        campaign: {
          updateMany: vi.fn(),
        },
      }),
    ),
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

const siaFindUnique = prisma.strategicInnovationArea.findUnique as unknown as Mock;
const siaFindMany = prisma.strategicInnovationArea.findMany as unknown as Mock;
const siaCreate = prisma.strategicInnovationArea.create as unknown as Mock;
const siaUpdate = prisma.strategicInnovationArea.update as unknown as Mock;
const _siaDelete = prisma.strategicInnovationArea.delete as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignUpdate = prisma.campaign.update as unknown as Mock;
const _campaignUpdateMany = prisma.campaign.updateMany as unknown as Mock;

const mockSia = {
  id: "sia-1",
  name: "Digital Transformation",
  description: "Focus on digitizing core processes",
  color: "#6366F1",
  bannerUrl: null,
  isActive: true,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { campaigns: 2 },
  createdBy: { id: "user-1", name: "Admin User", email: "admin@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listSias", () => {
  it("returns paginated SIAs", async () => {
    siaFindMany.mockResolvedValue([mockSia]);

    const result = await listSias({ limit: 20, sortBy: "name", sortDirection: "asc" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Digital Transformation");
    expect(result.items[0].campaignCount).toBe(2);
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by isActive", async () => {
    siaFindMany.mockResolvedValue([]);

    await listSias({ limit: 20, isActive: true, sortBy: "name", sortDirection: "asc" });

    expect(siaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    );
  });

  it("filters by search term", async () => {
    siaFindMany.mockResolvedValue([]);

    await listSias({
      limit: 20,
      search: "digital",
      sortBy: "name",
      sortDirection: "asc",
    });

    expect(siaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ name: { contains: "digital", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...mockSia,
      id: `sia-${i}`,
    }));
    siaFindMany.mockResolvedValue(items);

    const result = await listSias({ limit: 20, sortBy: "name", sortDirection: "asc" });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("sia-20");
  });
});

describe("getSiaById", () => {
  it("returns SIA with campaigns", async () => {
    const siaWithCampaigns = {
      ...mockSia,
      campaigns: [
        {
          id: "camp-1",
          title: "Test Campaign",
          status: "SUBMISSION",
          submissionCloseDate: new Date("2026-06-01"),
          _count: { ideas: 5, members: 10 },
        },
      ],
    };
    siaFindUnique.mockResolvedValue(siaWithCampaigns);

    const result = await getSiaById("sia-1");

    expect(result.name).toBe("Digital Transformation");
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0].title).toBe("Test Campaign");
    expect(result.campaigns[0].ideaCount).toBe(5);
  });

  it("throws SIA_NOT_FOUND when not found", async () => {
    siaFindUnique.mockResolvedValue(null);

    await expect(getSiaById("nonexistent")).rejects.toThrow(SiaServiceError);
    await expect(getSiaById("nonexistent")).rejects.toThrow("Strategic Innovation Area not found");
  });
});

describe("createSia", () => {
  it("creates a new SIA and emits event", async () => {
    siaCreate.mockResolvedValue(mockSia);

    const result = await createSia(
      { name: "Digital Transformation", color: "#6366F1", isActive: true },
      "user-1",
    );

    expect(result.name).toBe("Digital Transformation");
    expect(siaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Digital Transformation",
          createdById: "user-1",
        }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.created",
      expect.objectContaining({ entity: "sia", entityId: "sia-1" }),
    );
  });
});

describe("updateSia", () => {
  it("updates SIA and emits event", async () => {
    siaFindUnique.mockResolvedValue(mockSia);
    siaUpdate.mockResolvedValue({ ...mockSia, name: "Updated Name" });

    const result = await updateSia({ id: "sia-1", name: "Updated Name" }, "user-1");

    expect(result.name).toBe("Updated Name");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.updated",
      expect.objectContaining({ entityId: "sia-1" }),
    );
  });

  it("emits archived event when deactivating", async () => {
    siaFindUnique.mockResolvedValue({ ...mockSia, isActive: true });
    siaUpdate.mockResolvedValue({ ...mockSia, isActive: false });

    await updateSia({ id: "sia-1", isActive: false }, "user-1");

    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.archived",
      expect.objectContaining({ entityId: "sia-1" }),
    );
  });

  it("emits activated event when reactivating", async () => {
    siaFindUnique.mockResolvedValue({ ...mockSia, isActive: false });
    siaUpdate.mockResolvedValue({ ...mockSia, isActive: true });

    await updateSia({ id: "sia-1", isActive: true }, "user-1");

    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.activated",
      expect.objectContaining({ entityId: "sia-1" }),
    );
  });

  it("throws SIA_NOT_FOUND when not found", async () => {
    siaFindUnique.mockResolvedValue(null);

    await expect(updateSia({ id: "nonexistent", name: "x" }, "user-1")).rejects.toThrow(
      SiaServiceError,
    );
  });
});

describe("deleteSia", () => {
  it("unlinks campaigns and deletes SIA", async () => {
    siaFindUnique.mockResolvedValue({
      id: "sia-1",
      name: "Digital Transformation",
      _count: { campaigns: 2 },
    });

    const result = await deleteSia("sia-1", "user-1");

    expect(result.success).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.deleted",
      expect.objectContaining({ entityId: "sia-1" }),
    );
  });

  it("skips campaign unlinking when no campaigns linked", async () => {
    siaFindUnique.mockResolvedValue({
      id: "sia-1",
      name: "Test",
      _count: { campaigns: 0 },
    });

    const result = await deleteSia("sia-1", "user-1");

    expect(result.success).toBe(true);
  });

  it("throws SIA_NOT_FOUND when not found", async () => {
    siaFindUnique.mockResolvedValue(null);

    await expect(deleteSia("nonexistent", "user-1")).rejects.toThrow(SiaServiceError);
  });
});

describe("linkCampaignToSia", () => {
  it("links campaign to SIA and emits event", async () => {
    siaFindUnique.mockResolvedValue({ id: "sia-1", name: "Test SIA" });
    campaignFindUnique.mockResolvedValue({ id: "camp-1", title: "Test Campaign" });
    campaignUpdate.mockResolvedValue({ id: "camp-1", siaId: "sia-1" });

    const result = await linkCampaignToSia({ siaId: "sia-1", campaignId: "camp-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(campaignUpdate).toHaveBeenCalledWith({
      where: { id: "camp-1" },
      data: { siaId: "sia-1" },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.campaignLinked",
      expect.objectContaining({
        entityId: "sia-1",
        metadata: expect.objectContaining({ campaignId: "camp-1" }),
      }),
    );
  });

  it("throws when SIA not found", async () => {
    siaFindUnique.mockResolvedValue(null);

    await expect(
      linkCampaignToSia({ siaId: "nonexistent", campaignId: "camp-1" }, "user-1"),
    ).rejects.toThrow("Strategic Innovation Area not found");
  });

  it("throws when campaign not found", async () => {
    siaFindUnique.mockResolvedValue({ id: "sia-1", name: "Test" });
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      linkCampaignToSia({ siaId: "sia-1", campaignId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Campaign not found");
  });
});

describe("unlinkCampaignFromSia", () => {
  it("unlinks campaign from SIA and emits event", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "camp-1",
      siaId: "sia-1",
      title: "Test Campaign",
    });
    campaignUpdate.mockResolvedValue({ id: "camp-1", siaId: null });

    const result = await unlinkCampaignFromSia({ campaignId: "camp-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(campaignUpdate).toHaveBeenCalledWith({
      where: { id: "camp-1" },
      data: { siaId: null },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "sia.campaignUnlinked",
      expect.objectContaining({ entityId: "sia-1" }),
    );
  });

  it("returns success when campaign has no SIA", async () => {
    campaignFindUnique.mockResolvedValue({
      id: "camp-1",
      siaId: null,
      title: "Test",
    });

    const result = await unlinkCampaignFromSia({ campaignId: "camp-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(campaignUpdate).not.toHaveBeenCalled();
  });

  it("throws when campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(unlinkCampaignFromSia({ campaignId: "nonexistent" }, "user-1")).rejects.toThrow(
      "Campaign not found",
    );
  });
});
