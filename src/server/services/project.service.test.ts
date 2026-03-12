import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  ProjectServiceError,
} from "./project.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    processDefinition: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectTeamMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
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

const projectFindUnique = prisma.project.findUnique as unknown as Mock;
const projectFindMany = prisma.project.findMany as unknown as Mock;
const projectCreate = prisma.project.create as unknown as Mock;
const projectUpdate = prisma.project.update as unknown as Mock;
const projectDelete = prisma.project.delete as unknown as Mock;
const pdFindUnique = prisma.processDefinition.findUnique as unknown as Mock;
const teamMemberFindUnique = prisma.projectTeamMember.findUnique as unknown as Mock;
const teamMemberCreate = prisma.projectTeamMember.create as unknown as Mock;
const teamMemberDelete = prisma.projectTeamMember.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;

const mockProject = {
  id: "proj-1",
  title: "Smart Factory Initiative",
  description: "IoT-enabled manufacturing",
  status: "ACTIVE",
  isConfidential: false,
  processDefinitionId: "pd-1",
  currentPhaseId: "phase-1",
  createdById: "user-1",
  sourceIdeaId: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
  processDefinition: {
    id: "pd-1",
    name: "Stage-Gate",
    phases: [
      {
        id: "phase-1",
        name: "Discovery",
        description: null,
        plannedDurationDays: 30,
        position: 0,
        activities: [],
      },
    ],
  },
  currentPhase: { id: "phase-1", name: "Discovery" },
  createdBy: { id: "user-1", name: "Admin User", email: "admin@example.com" },
  sourceIdea: null,
  teamMembers: [
    {
      id: "tm-1",
      role: "LEADER",
      createdAt: new Date("2026-01-01"),
      user: { id: "user-1", name: "Admin User", email: "admin@example.com", image: null },
    },
  ],
};

const mockListProject = {
  ...mockProject,
  processDefinition: { id: "pd-1", name: "Stage-Gate" },
  currentPhase: { id: "phase-1", name: "Discovery" },
  sourceIdea: null,
  _count: { teamMembers: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listProjects", () => {
  it("returns paginated list", async () => {
    projectFindMany.mockResolvedValue([mockListProject]);

    const result = await listProjects({ limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Smart Factory Initiative");
    expect(result.items[0]?.teamMemberCount).toBe(1);
  });

  it("filters by status", async () => {
    projectFindMany.mockResolvedValue([]);

    await listProjects({ limit: 20, status: "ACTIVE" });

    const where = projectFindMany.mock.calls[0]?.[0]?.where;
    expect(where?.status).toBe("ACTIVE");
  });

  it("applies search filter", async () => {
    projectFindMany.mockResolvedValue([]);

    await listProjects({ limit: 20, search: "factory" });

    const where = projectFindMany.mock.calls[0]?.[0]?.where;
    expect(where?.OR).toBeDefined();
  });
});

describe("getProjectById", () => {
  it("returns full project with team and process", async () => {
    projectFindUnique.mockResolvedValue(mockProject);

    const result = await getProjectById("proj-1");

    expect(result.id).toBe("proj-1");
    expect(result.teamMembers).toHaveLength(1);
    expect(result.processDefinition.phases).toHaveLength(1);
  });

  it("throws when not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(getProjectById("nonexistent")).rejects.toThrow(ProjectServiceError);
  });
});

describe("createProject", () => {
  it("creates project from template", async () => {
    pdFindUnique.mockResolvedValue({
      id: "pd-1",
      phases: [{ id: "phase-1", position: 0 }],
    });
    projectCreate.mockResolvedValue({ id: "proj-1" });
    projectFindUnique.mockResolvedValue(mockProject);

    const result = await createProject(
      {
        title: "Smart Factory Initiative",
        description: "IoT-enabled manufacturing",
        processDefinitionId: "pd-1",
        teamMembers: [{ userId: "user-1", role: "LEADER" }],
      },
      "user-1",
    );

    expect(projectCreate).toHaveBeenCalledOnce();
    expect(result.title).toBe("Smart Factory Initiative");
    expect(eventBus.emit).toHaveBeenCalledWith("project.created", expect.any(Object));
  });

  it("throws when process definition not found", async () => {
    pdFindUnique.mockResolvedValue(null);

    await expect(
      createProject(
        { title: "Test", processDefinitionId: "nonexistent", teamMembers: [] },
        "user-1",
      ),
    ).rejects.toThrow("Process definition");
  });

  it("throws when source idea not found", async () => {
    pdFindUnique.mockResolvedValue({ id: "pd-1", phases: [] });
    ideaFindUnique.mockResolvedValue(null);

    await expect(
      createProject(
        {
          title: "Test",
          processDefinitionId: "pd-1",
          sourceIdeaId: "idea-nonexistent",
          teamMembers: [],
        },
        "user-1",
      ),
    ).rejects.toThrow("Idea");
  });
});

describe("updateProject", () => {
  it("updates project metadata", async () => {
    projectFindUnique.mockResolvedValueOnce(mockProject);
    projectUpdate.mockResolvedValue(mockProject);
    projectFindUnique.mockResolvedValueOnce(mockProject);

    const result = await updateProject({ id: "proj-1", title: "New Title" }, "user-1");

    expect(projectUpdate).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith("project.updated", expect.any(Object));
  });

  it("throws when not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(updateProject({ id: "nonexistent", title: "Foo" }, "user-1")).rejects.toThrow(
      ProjectServiceError,
    );
  });
});

describe("deleteProject", () => {
  it("deletes project", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    projectDelete.mockResolvedValue(mockProject);

    const result = await deleteProject("proj-1", "user-1");

    expect(projectDelete).toHaveBeenCalledOnce();
    expect(result.id).toBe("proj-1");
  });

  it("throws when not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(deleteProject("nonexistent", "user-1")).rejects.toThrow(ProjectServiceError);
  });
});

describe("addTeamMember", () => {
  it("adds a team member", async () => {
    projectFindUnique.mockResolvedValueOnce(mockProject);
    userFindUnique.mockResolvedValue({ id: "user-2", name: "New Member" });
    teamMemberFindUnique.mockResolvedValue(null);
    teamMemberCreate.mockResolvedValue({ id: "tm-2" });
    projectFindUnique.mockResolvedValueOnce(mockProject);

    const result = await addTeamMember(
      { projectId: "proj-1", userId: "user-2", role: "MEMBER" },
      "user-1",
    );

    expect(teamMemberCreate).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith("project.teamMemberAdded", expect.any(Object));
  });

  it("throws when project not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(
      addTeamMember({ projectId: "nonexistent", userId: "user-2", role: "MEMBER" }, "user-1"),
    ).rejects.toThrow("Project");
  });

  it("throws when user already a member", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    userFindUnique.mockResolvedValue({ id: "user-2" });
    teamMemberFindUnique.mockResolvedValue({ id: "tm-existing" });

    await expect(
      addTeamMember({ projectId: "proj-1", userId: "user-2", role: "MEMBER" }, "user-1"),
    ).rejects.toThrow("already a team member");
  });
});

describe("removeTeamMember", () => {
  it("removes a team member", async () => {
    projectFindUnique.mockResolvedValueOnce(mockProject);
    teamMemberFindUnique.mockResolvedValue({ id: "tm-1" });
    teamMemberDelete.mockResolvedValue({ id: "tm-1" });
    projectFindUnique.mockResolvedValueOnce(mockProject);

    const result = await removeTeamMember({ projectId: "proj-1", userId: "user-1" }, "user-1");

    expect(teamMemberDelete).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith("project.teamMemberRemoved", expect.any(Object));
  });

  it("throws when member not found", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    teamMemberFindUnique.mockResolvedValue(null);

    await expect(
      removeTeamMember({ projectId: "proj-1", userId: "user-99" }, "user-1"),
    ).rejects.toThrow("not a team member");
  });
});
