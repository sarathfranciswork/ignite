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

const mockTechnology = {
  id: "tech-1",
  title: "Kubernetes",
  description: "Container orchestration platform",
  imageUrl: null,
  sourceUrl: "https://kubernetes.io",
  maturityLevel: "MATURE",
  isConfidential: false,
  isArchived: false,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { sias: 2 },
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
    expect(result.nextCursor).toBeUndefined();
  });

  it("filters by maturityLevel", async () => {
    techFindMany.mockResolvedValue([]);

    await listTechnologies({
      limit: 20,
      maturityLevel: "EMERGING",
      sortBy: "title",
      sortDirection: "asc",
    });

    expect(techFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ maturityLevel: "EMERGING" }),
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
    };
    techFindUnique.mockResolvedValue(techWithRelations);

    const result = await getTechnologyById("tech-1");

    expect(result.title).toBe("Kubernetes");
    expect(result.sias).toHaveLength(1);
    expect(result.sias[0].name).toBe("Digital Transform");
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

    const result = await createTechnology({ title: "Kubernetes", isConfidential: false }, "user-1");

    expect(result.title).toBe("Kubernetes");
    expect(techCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Kubernetes",
          createdById: "user-1",
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

  it("emits unarchived event when restoring", async () => {
    techFindUnique.mockResolvedValue({ ...mockTechnology, isArchived: true });
    techUpdate.mockResolvedValue({ ...mockTechnology, isArchived: false });

    await archiveTechnology("tech-1", "user-1");

    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.unarchived",
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

    const result = await linkTechnologyToSia({ techId: "tech-1", siaId: "sia-1" }, "user-1");

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

    const result = await linkTechnologyToSia({ techId: "tech-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(techSiaLinkCreate).not.toHaveBeenCalled();
  });

  it("throws when technology not found", async () => {
    techFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToSia({ techId: "nonexistent", siaId: "sia-1" }, "user-1"),
    ).rejects.toThrow("Technology not found");
  });

  it("throws when SIA not found", async () => {
    techFindUnique.mockResolvedValue({ id: "tech-1", title: "K8s" });
    siaFindUnique.mockResolvedValue(null);

    await expect(
      linkTechnologyToSia({ techId: "tech-1", siaId: "nonexistent" }, "user-1"),
    ).rejects.toThrow("Strategic Innovation Area not found");
  });
});

describe("unlinkTechnologyFromSia", () => {
  it("unlinks technology from SIA and emits event", async () => {
    techSiaLinkFindUnique.mockResolvedValue({ id: "link-1" });
    techSiaLinkDelete.mockResolvedValue(undefined);

    const result = await unlinkTechnologyFromSia({ techId: "tech-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(techSiaLinkDelete).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      "technology.siaUnlinked",
      expect.objectContaining({ entityId: "tech-1" }),
    );
  });

  it("returns success when not linked", async () => {
    techSiaLinkFindUnique.mockResolvedValue(null);

    const result = await unlinkTechnologyFromSia({ techId: "tech-1", siaId: "sia-1" }, "user-1");

    expect(result.success).toBe(true);
    expect(techSiaLinkDelete).not.toHaveBeenCalled();
  });
});
