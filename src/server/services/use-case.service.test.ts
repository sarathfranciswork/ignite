import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listUseCases,
  getUseCaseById,
  createUseCase,
  updateUseCase,
  transitionUseCase,
  deleteUseCase,
  addTeamMember,
  linkOrganization,
  createTask,
  updateTask,
  getUseCaseFunnel,
  UseCaseServiceError,
} from "./use-case.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    useCase: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    useCaseTeamMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    useCaseOrganization: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    useCaseTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
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

const ucFindUnique = prisma.useCase.findUnique as unknown as Mock;
const ucFindMany = prisma.useCase.findMany as unknown as Mock;
const ucCreate = prisma.useCase.create as unknown as Mock;
const ucUpdate = prisma.useCase.update as unknown as Mock;
const ucDelete = prisma.useCase.delete as unknown as Mock;
const ucGroupBy = prisma.useCase.groupBy as unknown as Mock;
const teamFindUnique = prisma.useCaseTeamMember.findUnique as unknown as Mock;
const teamCreate = prisma.useCaseTeamMember.create as unknown as Mock;
const orgLinkFindUnique = prisma.useCaseOrganization.findUnique as unknown as Mock;
const orgLinkCreate = prisma.useCaseOrganization.create as unknown as Mock;
const orgFindUnique = prisma.organization.findUnique as unknown as Mock;
const taskFindUnique = prisma.useCaseTask.findUnique as unknown as Mock;
const taskCreate = prisma.useCaseTask.create as unknown as Mock;
const taskUpdate = prisma.useCaseTask.update as unknown as Mock;

const mockUser = { id: "user-1", name: "Test User", email: "test@example.com", image: null };

const mockUseCase = {
  id: "uc-1",
  title: "Test Use Case",
  problemDescription: "A test problem",
  suggestedSolution: "A test solution",
  benefit: "Test benefit",
  status: "IDENTIFIED" as const,
  previousStatus: null,
  ownerId: "user-1",
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  owner: mockUser,
  createdBy: mockUser,
  teamMembers: [
    {
      id: "tm-1",
      role: "LEAD",
      user: mockUser,
      assignedAt: new Date("2026-01-01"),
    },
  ],
  organizations: [],
  _count: { tasks: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("use-case.service", () => {
  describe("listUseCases", () => {
    it("returns paginated use cases", async () => {
      ucFindMany.mockResolvedValue([mockUseCase]);

      const result = await listUseCases({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("uc-1");
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by status", async () => {
      ucFindMany.mockResolvedValue([]);

      await listUseCases({ limit: 20, status: "QUALIFICATION" });

      expect(ucFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "QUALIFICATION" }),
        }),
      );
    });

    it("filters by search term", async () => {
      ucFindMany.mockResolvedValue([]);

      await listUseCases({ limit: 20, search: "test" });

      expect(ucFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: "test" }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe("getUseCaseById", () => {
    it("returns use case with tasks", async () => {
      ucFindUnique.mockResolvedValue({ ...mockUseCase, tasks: [] });

      const result = await getUseCaseById("uc-1");

      expect(result.id).toBe("uc-1");
      expect(result.tasks).toEqual([]);
    });

    it("throws when not found", async () => {
      ucFindUnique.mockResolvedValue(null);

      await expect(getUseCaseById("nonexistent")).rejects.toThrow(UseCaseServiceError);
    });
  });

  describe("createUseCase", () => {
    it("creates a use case and emits event", async () => {
      ucCreate.mockResolvedValue(mockUseCase);

      const result = await createUseCase({ title: "New UC" }, "user-1");

      expect(result.id).toBe("uc-1");
      expect(ucCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: "New UC", ownerId: "user-1" }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.created",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });
  });

  describe("updateUseCase", () => {
    it("updates and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      ucUpdate.mockResolvedValue(mockUseCase);

      const result = await updateUseCase({ id: "uc-1", title: "Updated" }, "user-1");

      expect(result.id).toBe("uc-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.updated",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });

    it("throws when not found", async () => {
      ucFindUnique.mockResolvedValue(null);

      await expect(updateUseCase({ id: "nope", title: "X" }, "user-1")).rejects.toThrow(
        UseCaseServiceError,
      );
    });
  });

  describe("transitionUseCase", () => {
    it("transitions and emits statusChanged event", async () => {
      ucFindUnique.mockResolvedValue({
        id: "uc-1",
        status: "EVALUATION",
        _count: { organizations: 1, teamMembers: 2 },
      });
      ucUpdate.mockResolvedValue({ ...mockUseCase, status: "PILOT", previousStatus: "EVALUATION" });

      const result = await transitionUseCase({ id: "uc-1", targetStatus: "PILOT" }, "user-1");

      expect(result.status).toBe("PILOT");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.statusChanged",
        expect.objectContaining({
          metadata: expect.objectContaining({ from: "EVALUATION", to: "PILOT" }),
        }),
      );
    });

    it("rejects invalid transitions", async () => {
      ucFindUnique.mockResolvedValue({
        id: "uc-1",
        status: "IDENTIFIED",
        _count: { organizations: 0, teamMembers: 1 },
      });

      await expect(
        transitionUseCase({ id: "uc-1", targetStatus: "PILOT" }, "user-1"),
      ).rejects.toThrow(UseCaseServiceError);
    });

    it("rejects when guard fails - no linked organization", async () => {
      ucFindUnique.mockResolvedValue({
        id: "uc-1",
        status: "IDENTIFIED",
        _count: { organizations: 0, teamMembers: 1 },
      });

      await expect(
        transitionUseCase({ id: "uc-1", targetStatus: "QUALIFICATION" }, "user-1"),
      ).rejects.toThrow("organization must be linked");
    });

    it("rejects when guard fails - no team assigned", async () => {
      ucFindUnique.mockResolvedValue({
        id: "uc-1",
        status: "QUALIFICATION",
        _count: { organizations: 1, teamMembers: 1 },
      });

      await expect(
        transitionUseCase({ id: "uc-1", targetStatus: "EVALUATION" }, "user-1"),
      ).rejects.toThrow("team must be assigned");
    });
  });

  describe("deleteUseCase", () => {
    it("deletes and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1", title: "Test UC" });
      ucDelete.mockResolvedValue({});

      const result = await deleteUseCase("uc-1", "user-1");

      expect(result.id).toBe("uc-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.deleted",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });
  });

  describe("addTeamMember", () => {
    it("adds a team member and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      teamFindUnique.mockResolvedValue(null);
      teamCreate.mockResolvedValue({
        id: "tm-2",
        role: "MEMBER",
        user: mockUser,
        assignedAt: new Date("2026-01-01"),
      });

      const result = await addTeamMember(
        { useCaseId: "uc-1", userId: "user-2", role: "MEMBER" },
        "user-1",
      );

      expect(result.id).toBe("tm-2");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.teamMemberAdded",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });

    it("rejects duplicate team members", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      teamFindUnique.mockResolvedValue({ id: "tm-existing" });

      await expect(
        addTeamMember({ useCaseId: "uc-1", userId: "user-1", role: "MEMBER" }, "user-1"),
      ).rejects.toThrow("already a team member");
    });
  });

  describe("linkOrganization", () => {
    it("links an organization and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      orgFindUnique.mockResolvedValue({ id: "org-1", name: "Test Org" });
      orgLinkFindUnique.mockResolvedValue(null);
      orgLinkCreate.mockResolvedValue({
        id: "link-1",
        organization: {
          id: "org-1",
          name: "Test Org",
          industry: "Tech",
          relationshipStatus: "IDENTIFIED",
          logoUrl: null,
        },
      });

      const result = await linkOrganization(
        { useCaseId: "uc-1", organizationId: "org-1" },
        "user-1",
      );

      expect(result.organization.name).toBe("Test Org");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCase.organizationLinked",
        expect.objectContaining({ entityId: "uc-1" }),
      );
    });
  });

  describe("createTask", () => {
    it("creates a task and emits event", async () => {
      ucFindUnique.mockResolvedValue({ id: "uc-1" });
      taskCreate.mockResolvedValue({
        id: "task-1",
        useCaseId: "uc-1",
        title: "Do something",
        description: null,
        status: "OPEN",
        assignee: null,
        dueDate: null,
        sortOrder: 0,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });

      const result = await createTask(
        { useCaseId: "uc-1", title: "Do something", status: "OPEN" },
        "user-1",
      );

      expect(result.title).toBe("Do something");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCaseTask.created",
        expect.objectContaining({ entityId: "task-1" }),
      );
    });
  });

  describe("updateTask", () => {
    it("emits statusChanged when status changes", async () => {
      taskFindUnique.mockResolvedValue({
        id: "task-1",
        useCaseId: "uc-1",
        status: "OPEN",
      });
      taskUpdate.mockResolvedValue({
        id: "task-1",
        useCaseId: "uc-1",
        title: "Do something",
        description: null,
        status: "COMPLETED",
        assignee: null,
        dueDate: null,
        sortOrder: 0,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });

      await updateTask({ id: "task-1", status: "COMPLETED" }, "user-1");

      expect(eventBus.emit).toHaveBeenCalledWith(
        "useCaseTask.statusChanged",
        expect.objectContaining({
          metadata: expect.objectContaining({ from: "OPEN", to: "COMPLETED" }),
        }),
      );
    });
  });

  describe("getUseCaseFunnel", () => {
    it("returns counts for all pipeline statuses", async () => {
      ucGroupBy.mockResolvedValue([
        { status: "IDENTIFIED", _count: { _all: 5 } },
        { status: "QUALIFICATION", _count: { _all: 3 } },
        { status: "EVALUATION", _count: { _all: 2 } },
      ]);

      const result = await getUseCaseFunnel({});

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ status: "IDENTIFIED", label: "Identified", count: 5 });
      expect(result[1]).toEqual({ status: "QUALIFICATION", label: "Qualification", count: 3 });
      expect(result[2]).toEqual({ status: "EVALUATION", label: "Evaluation", count: 2 });
      expect(result[3]).toEqual({ status: "PILOT", label: "Pilot", count: 0 });
      expect(result[4]).toEqual({ status: "PARTNERSHIP", label: "Partnership", count: 0 });
    });
  });
});
