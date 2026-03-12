import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listTechnologies,
  getTechnologyById,
  createTechnology,
  updateTechnology,
  archiveTechnology,
  deleteTechnology,
  linkTechnologyToSia,
  unlinkTechnologyFromSia,
  linkTechnologyToCampaign,
  unlinkTechnologyFromCampaign,
  linkTechnologyToIdea,
  unlinkTechnologyFromIdea,
  TechnologyServiceError,
} from "./technology.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    technology: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    techSiaLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    strategicInnovationArea: {
      findUnique: vi.fn(),
    },
    technologyCampaignLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    technologyIdeaLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    idea: {
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

const techFindUnique = prisma.technology.findUnique as unknown as Mock;
const techFindMany = prisma.technology.findMany as unknown as Mock;
const techCreate = prisma.technology.create as unknown as Mock;
const techUpdate = prisma.technology.update as unknown as Mock;
const techDelete = prisma.technology.delete as unknown as Mock;
const techSiaLinkFindUnique = prisma.techSiaLink.findUnique as unknown as Mock;
const techSiaLinkCreate = prisma.techSiaLink.create as unknown as Mock;
const techSiaLinkDelete = prisma.techSiaLink.delete as unknown as Mock;
const siaFindUnique = prisma.strategicInnovationArea.findUnique as unknown as Mock;
const _campaignLinkFindUnique = prisma.technologyCampaignLink.findUnique as unknown as Mock;
const _campaignLinkCreate = prisma.technologyCampaignLink.create as unknown as Mock;
const _campaignLinkDelete = prisma.technologyCampaignLink.delete as unknown as Mock;
const _campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const _ideaLinkFindUnique = prisma.technologyIdeaLink.findUnique as unknown as Mock;
const _ideaLinkCreate = prisma.technologyIdeaLink.create as unknown as Mock;
const _ideaLinkDelete = prisma.technologyIdeaLink.delete as unknown as Mock;
const _ideaFindUnique = prisma.idea.findUnique as unknown as Mock;

const mockTechnology = {
  id: "tech-1",
  title: "Kubernetes",
  description: "Container orchestration platform",
  imageUrl: null,
  sourceUrl: "https://kubernetes.io",
  category: "CLOUD",
  maturity: "MATURE",
  isConfidential: false,
  isArchived: false,
  isCommunitySubmitted: false,
  businessRelevance: 8.5,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { sias: 2, campaigns: 1, ideas: 3 },
  createdBy: { id: "user-1", name: "Admin", email: "admin@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listTechnologies", () => {
  it("returns paginated technologies", async () => {
    techFindMany.mockResolvedValue([mockTechnology]);

    const result = await listTechnologies({ limit: 20, sortBy: "title", sortDirection: "asc" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Kubernetes");
    expect(result.items[0].siaCount).toBe(2);
    expect(result.items[0].campaignCount).toBe(1);
    expect(result.items[0].ideaCount).toBe(3);
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by category", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({
      limit: 20,
      category: "CLOUD",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "CLOUD" }),
      }),
    );
  });

  it("filters by maturity", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({
      limit: 20,
      maturity: "EMERGING",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ maturity: "EMERGING" }),
      }),
    );
  });

  it("filters by siaId", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({ limit: 20, siaId: "sia-1", sortBy: "title", sortDirection: "asc" });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sias: { some: { siaId: "sia-1" } },
        }),
      }),
    );
  });

  it("filters by campaignId", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({
      limit: 20,
      campaignId: "camp-1",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          campaigns: { some: { campaignId: "camp-1" } },
        }),
      }),
    );
  });

  it("filters by ideaId", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({
      limit: 20,
      ideaId: "idea-1",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ideas: { some: { ideaId: "idea-1" } },
        }),
      }),
    );
  });

  it("filters by search term", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({
      limit: 20,
      search: "kubernetes",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ title: { contains: "kubernetes", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({
      ...mockTechnology,
      id: `tech-${i}`,
    }));
    techFindMany.mockResolvedValue(items);

    const result = await listTechnologies({ limit: 20, sortBy: "title", sortDirection: "asc" });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("tech-20");
  });
});

describe("getTechnologyById", () => {
  it("returns technology with relations", async () => {
    const techWithRelations = {
      ...mockTechnology,
      sias: [{ sia: { id: "sia-1", name: "Digital Transform", color: "#6366F1", isActive: true } }],
      campaigns: [{ campaign: { id: "camp-1", title: "Innovation Q1", status: "ACTIVE" } }],
      ideas: [{ idea: { id: "idea-1", title: "AI Chatbot", status: "SUBMITTED" } }],
    };
    techFindUnique.mockResolvedValue(techWithRelations);

    const result = await getTechnologyById("tech-1");

    expect(result.title).toBe("Kubernetes");
    expect(result.sias).toHaveLength(1);
    expect(result.sias[0].name).toBe("Digital Transform");
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0].title).toBe("Innovation Q1");
    expect(result.ideas).toHaveLength(1);
    expect(result.ideas[0].title).toBe("AI Chatbot");
  });

  it("throws TECHNOLOGY_NOT_FOUND when not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(getTechnologyById("nonexistent")).rejects.toThrow(TechnologyServiceError);
    await expect(getTechnologyById("nonexistent")).rejects.toThrow("Technology not found");
  });
});

describe("createTechnology", () => {
  it("creates a new technology and emits event", async () => {
    techCreate.mockResolvedValue(mockTechnology);

    const result = await createTechnology(
      {
        title: "Kubernetes",
        isConfidential: false,
        isCommunitySubmitted: false,
        category: "CLOUD",
        maturity: "MATURE",
      },
      "user-1",
    );

    expect(result.title).toBe("Kubernetes");
    expect(techCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Kubernetes",
          createdById: "user-1",
          category: "CLOUD",
        }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.created",
      expect.objectContaining({ entity: "technology", entityId: "tech-1" }),
    );
  });
});

describe("updateTechnology", () => {
  it("updates technology and emits event", async () => {
    techFindUnique.mockResolvedValue(mockTechnology);
    techUpdate.mockResolvedValue({ ...mockTechnology, title: "Updated Title" });

    const result = await updateTechnology({ id: "tech-1", title: "Updated Title" }, "user-1");

    expect(result.title).toBe("Updated Title");
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.updated",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("throws TECHNOLOGY_NOT_FOUND when not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(updateTechnology({ id: "nonexistent", title: "x" }, "user-1")).rejects.toThrow(
      TechnologyServiceError,
    );
  });
});

describe("archiveTechnology", () => {
  it("toggles archive state and emits event", async () => {
    techFindUnique.mockResolvedValue({ ...mockTechnology, isArchived: false });
    techUpdate.mockResolvedValue({ ...mockTechnology, isArchived: true });

    const result = await archiveTechnology("tech-1", "user-1");

    expect(result.isArchived).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.archived",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("emits activated event when restoring", async () => {
    techFindUnique.mockResolvedValue({ ...mockTechnology, isArchived: true });
    techUpdate.mockResolvedValue({ ...mockTechnology, isArchived: false });

    await archiveTechnology("tech-1", "user-1");

    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.activated",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("throws TECHNOLOGY_NOT_FOUND when not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(archiveTechnology("nonexistent", "user-1")).rejects.toThrow(
      TechnologyServiceError,
    );
  });
});

describe("deleteTechnology", () => {
  it("deletes technology and emits event", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "Kubernetes" });
    techDelete.mockResolvedValue(undefined);

    const result = await deleteTechnology("tech-1", "user-1");

    expect(result.success).toBe(true);
    expect(techDelete).toHaveBeenCalledWith({ where: { id: "tech-1" } });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.deleted",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("throws TECHNOLOGY_NOT_FOUND when not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(deleteTechnology("nonexistent", "user-1")).rejects.toThrow(TechnologyServiceError);
  });
});

describe("linkTechnologyToSia", () => {
  it("links technology to SIA and emits event", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    siaFindUnique.mockResolvedValue({ id: "sia-1", name: "Digital" });
    techSiaLinkFindUnique.mockResolvedValue(null);
    techSiaLinkCreate.mockResolvedValue({ id: "link-1" });

    const result = await linkTechnologyToSia({ technologyId: "tech-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(techSiaLinkCreate).toHaveBeenCalledWith({
      data: { techId: "tech-1", siaId: "sia-1" },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.siaLinked",
      expect.objectContaining({
        entityId: "tech-1",
        metadata: expect.objectContaining({ siaId: "sia-1" }),
      }),
    );
  });

  it("returns success when already linked", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    siaFindUnique.mockResolvedValue({ id: "sia-1", name: "Digital" });
    techSiaLinkFindUnique.mockResolvedValue({ id: "existing-link" });

    const result = await linkTechnologyToSia({ technologyId: "tech-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(techSiaLinkCreate).not.toHaveBeenCalled();
  });

  it("throws when technology not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToSia({ technologyId: "nonexistent", siaId: "sia-1" }, "user-1"),
    ).rejects.toThrow("Technology not found");
  });

  it("throws when SIA not found", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    siaFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToSia({ technologyId: "tech-1", siaId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Strategic Innovation Area not found");
  });
});

describe("unlinkTechnologyFromSia", () => {
  it("unlinks technology from SIA and emits event", async () => {
    techSiaLinkFindUnique.mockResolvedValue({ id: "link-1" });
    techSiaLinkDelete.mockResolvedValue(undefined);

    const result = await unlinkTechnologyFromSia(
      { technologyId: "tech-1", siaId: "sia-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(techSiaLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.siaUnlinked",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("returns success when not linked", async () => {
    techSiaLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkTechnologyFromSia(
      { technologyId: "tech-1", siaId: "sia-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(techSiaLinkDelete).not.toHaveBeenCalled();
  });
});

describe("linkTechnologyToCampaign", () => {
  it("links technology to campaign and emits event", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    _campaignFindUnique.mockResolvedValue({ id: "camp-1", title: "Innovation Q1" });
    _campaignLinkFindUnique.mockResolvedValue(null);
    _campaignLinkCreate.mockResolvedValue({ id: "link-1" });

    const result = await linkTechnologyToCampaign(
      { technologyId: "tech-1", campaignId: "camp-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_campaignLinkCreate).toHaveBeenCalledWith({
      data: { technologyId: "tech-1", campaignId: "camp-1" },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.campaignLinked",
      expect.objectContaining({
        entityId: "tech-1",
        metadata: expect.objectContaining({ campaignId: "camp-1" }),
      }),
    );
  });

  it("returns success when already linked", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    _campaignFindUnique.mockResolvedValue({ id: "camp-1", title: "Innovation Q1" });
    _campaignLinkFindUnique.mockResolvedValue({ id: "existing-link" });

    const result = await linkTechnologyToCampaign(
      { technologyId: "tech-1", campaignId: "camp-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_campaignLinkCreate).not.toHaveBeenCalled();
  });

  it("throws when technology not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToCampaign({ technologyId: "nonexistent", campaignId: "camp-1" }, "user-1"),
    ).rejects.toThrow("Technology not found");
  });

  it("throws when campaign not found", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    _campaignFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToCampaign({ technologyId: "tech-1", campaignId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Campaign not found");
  });
});

describe("unlinkTechnologyFromCampaign", () => {
  it("unlinks technology from campaign and emits event", async () => {
    _campaignLinkFindUnique.mockResolvedValue({ id: "link-1" });
    _campaignLinkDelete.mockResolvedValue(undefined);

    const result = await unlinkTechnologyFromCampaign(
      { technologyId: "tech-1", campaignId: "camp-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_campaignLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.campaignUnlinked",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("returns success when not linked", async () => {
    _campaignLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkTechnologyFromCampaign(
      { technologyId: "tech-1", campaignId: "camp-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_campaignLinkDelete).not.toHaveBeenCalled();
  });
});

describe("linkTechnologyToIdea", () => {
  it("links technology to idea and emits event", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    _ideaFindUnique.mockResolvedValue({ id: "idea-1", title: "AI Chatbot" });
    _ideaLinkFindUnique.mockResolvedValue(null);
    _ideaLinkCreate.mockResolvedValue({ id: "link-1" });

    const result = await linkTechnologyToIdea(
      { technologyId: "tech-1", ideaId: "idea-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_ideaLinkCreate).toHaveBeenCalledWith({
      data: { technologyId: "tech-1", ideaId: "idea-1" },
    });
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.ideaLinked",
      expect.objectContaining({
        entityId: "tech-1",
        metadata: expect.objectContaining({ ideaId: "idea-1" }),
      }),
    );
  });

  it("returns success when already linked", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    _ideaFindUnique.mockResolvedValue({ id: "idea-1", title: "AI Chatbot" });
    _ideaLinkFindUnique.mockResolvedValue({ id: "existing-link" });

    const result = await linkTechnologyToIdea(
      { technologyId: "tech-1", ideaId: "idea-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_ideaLinkCreate).not.toHaveBeenCalled();
  });

  it("throws when technology not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToIdea({ technologyId: "nonexistent", ideaId: "idea-1" }, "user-1"),
    ).rejects.toThrow("Technology not found");
  });

  it("throws when idea not found", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    _ideaFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToIdea({ technologyId: "tech-1", ideaId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Idea not found");
  });
});

describe("unlinkTechnologyFromIdea", () => {
  it("unlinks technology from idea and emits event", async () => {
    _ideaLinkFindUnique.mockResolvedValue({ id: "link-1" });
    _ideaLinkDelete.mockResolvedValue(undefined);

    const result = await unlinkTechnologyFromIdea(
      { technologyId: "tech-1", ideaId: "idea-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_ideaLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.ideaUnlinked",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("returns success when not linked", async () => {
    _ideaLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkTechnologyFromIdea(
      { technologyId: "tech-1", ideaId: "idea-1" },
      "user-1",
    );

    expect(result.success).toBe(true);
    expect(_ideaLinkDelete).not.toHaveBeenCalled();
  });
});
