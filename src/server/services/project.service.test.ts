import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  listPhaseActivities,
  listTaskAssignments,
  getTaskAssignment,
  upsertTaskAssignment,
  updateTaskStatus,
  checkMandatoryTasksComplete,
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
    projectPhaseInstance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    gateDecision: {
      create: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    projectTaskAssignment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    processPhase: {
      findUnique: vi.fn(),
    },
    processPhaseActivityTask: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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
const taskAssignmentFindUnique = prisma.projectTaskAssignment.findUnique as unknown as Mock;
const taskAssignmentFindMany = prisma.projectTaskAssignment.findMany as unknown as Mock;
const taskAssignmentUpsert = prisma.projectTaskAssignment.upsert as unknown as Mock;
const taskAssignmentUpdate = prisma.projectTaskAssignment.update as unknown as Mock;
const taskAssignmentCount = prisma.projectTaskAssignment.count as unknown as Mock;
const processPhaseFindUnique = prisma.processPhase.findUnique as unknown as Mock;
const activityTaskFindUnique = prisma.processPhaseActivityTask.findUnique as unknown as Mock;
const activityTaskFindMany = prisma.processPhaseActivityTask.findMany as unknown as Mock;

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

    const _result = await updateProject({ id: "proj-1", title: "New Title" }, "user-1");

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

    const _result = await addTeamMember(
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

    const _result = await removeTeamMember({ projectId: "proj-1", userId: "user-1" }, "user-1");

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

// ── Activity & Task Management Tests ──────────────────────

const mockPhaseWithActivities = {
  id: "phase-1",
  name: "Discovery",
  activities: [
    {
      id: "act-1",
      name: "Market Research",
      description: "Research market trends",
      isMandatory: true,
      position: 0,
      tasks: [
        {
          id: "task-1",
          name: "Market Analysis",
          fieldType: "TEXT",
          isMandatory: true,
          position: 0,
        },
        {
          id: "task-2",
          name: "Budget Estimate",
          fieldType: "NUMBER",
          isMandatory: false,
          position: 1,
        },
      ],
    },
  ],
};

const mockTaskAssignment = {
  id: "ta-1",
  projectId: "proj-1",
  taskId: "task-1",
  phaseId: "phase-1",
  assigneeId: "user-1",
  status: "TODO",
  dueDate: new Date("2026-04-01"),
  textValue: null,
  numberValue: null,
  dateValue: null,
  keywordValue: [],
  fileUrl: null,
  userValue: null,
  completedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  task: {
    id: "task-1",
    name: "Market Analysis",
    fieldType: "TEXT",
    isMandatory: true,
    position: 0,
    activity: { id: "act-1", name: "Market Research", isMandatory: true },
  },
  assignee: { id: "user-1", name: "Admin User", email: "admin@example.com", image: null },
};

describe("listPhaseActivities", () => {
  it("returns activities with task progress", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    processPhaseFindUnique.mockResolvedValue(mockPhaseWithActivities);
    taskAssignmentFindMany.mockResolvedValue([{ taskId: "task-1", status: "COMPLETED" }]);

    const result = await listPhaseActivities({ projectId: "proj-1", phaseId: "phase-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.totalTasks).toBe(2);
    expect(result[0]?.completedTasks).toBe(1);
    expect(result[0]?.tasks).toHaveLength(2);
  });

  it("throws when project not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(
      listPhaseActivities({ projectId: "nonexistent", phaseId: "phase-1" }),
    ).rejects.toThrow(ProjectServiceError);
  });

  it("throws when phase not found", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    processPhaseFindUnique.mockResolvedValue(null);

    await expect(
      listPhaseActivities({ projectId: "proj-1", phaseId: "nonexistent" }),
    ).rejects.toThrow("Phase");
  });
});

describe("listTaskAssignments", () => {
  it("returns task assignments for a project", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    taskAssignmentFindMany.mockResolvedValue([mockTaskAssignment]);

    const result = await listTaskAssignments({ projectId: "proj-1" });

    expect(result).toHaveLength(1);
    expect(result[0]?.taskId).toBe("task-1");
    expect(result[0]?.task.name).toBe("Market Analysis");
  });

  it("throws when project not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(listTaskAssignments({ projectId: "nonexistent" })).rejects.toThrow(
      ProjectServiceError,
    );
  });
});

describe("getTaskAssignment", () => {
  it("returns a single task assignment", async () => {
    taskAssignmentFindUnique.mockResolvedValue(mockTaskAssignment);

    const result = await getTaskAssignment({ projectId: "proj-1", taskId: "task-1" });

    expect(result.taskId).toBe("task-1");
    expect(result.assignee?.name).toBe("Admin User");
  });

  it("throws when not found", async () => {
    taskAssignmentFindUnique.mockResolvedValue(null);

    await expect(getTaskAssignment({ projectId: "proj-1", taskId: "nonexistent" })).rejects.toThrow(
      ProjectServiceError,
    );
  });
});

describe("upsertTaskAssignment", () => {
  it("creates a new task assignment", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    activityTaskFindUnique.mockResolvedValue({ id: "task-1" });
    teamMemberFindUnique.mockResolvedValue({ id: "tm-1" });
    taskAssignmentUpsert.mockResolvedValue(mockTaskAssignment);

    const result = await upsertTaskAssignment(
      {
        projectId: "proj-1",
        taskId: "task-1",
        phaseId: "phase-1",
        assigneeId: "user-1",
        dueDate: "2026-04-01T00:00:00.000Z",
        textValue: "Market analysis report",
      },
      "user-1",
    );

    expect(taskAssignmentUpsert).toHaveBeenCalledOnce();
    expect(result.taskId).toBe("task-1");
    expect(eventBus.emit).toHaveBeenCalledWith("project.taskUpdated", expect.any(Object));
  });

  it("throws when project not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(
      upsertTaskAssignment(
        { projectId: "nonexistent", taskId: "task-1", phaseId: "phase-1" },
        "user-1",
      ),
    ).rejects.toThrow("Project");
  });

  it("throws when task not found", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    activityTaskFindUnique.mockResolvedValue(null);

    await expect(
      upsertTaskAssignment(
        { projectId: "proj-1", taskId: "nonexistent", phaseId: "phase-1" },
        "user-1",
      ),
    ).rejects.toThrow("Task");
  });

  it("throws when assignee is not a team member", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    activityTaskFindUnique.mockResolvedValue({ id: "task-1" });
    teamMemberFindUnique.mockResolvedValue(null);

    await expect(
      upsertTaskAssignment(
        { projectId: "proj-1", taskId: "task-1", phaseId: "phase-1", assigneeId: "user-99" },
        "user-1",
      ),
    ).rejects.toThrow("team member");
  });
});

describe("updateTaskStatus", () => {
  it("marks task as completed with timestamp", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    taskAssignmentFindUnique.mockResolvedValue({
      ...mockTaskAssignment,
      task: { id: "task-1", name: "Market Analysis", isMandatory: true },
    });
    taskAssignmentUpdate.mockResolvedValue({
      ...mockTaskAssignment,
      status: "COMPLETED",
      completedAt: new Date(),
    });

    const _result = await updateTaskStatus(
      { projectId: "proj-1", taskId: "task-1", status: "COMPLETED" },
      "user-1",
    );

    expect(taskAssignmentUpdate).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith("project.taskCompleted", expect.any(Object));
  });

  it("emits taskUpdated when not completing", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    taskAssignmentFindUnique.mockResolvedValue({
      ...mockTaskAssignment,
      task: { id: "task-1", name: "Market Analysis", isMandatory: true },
    });
    taskAssignmentUpdate.mockResolvedValue({
      ...mockTaskAssignment,
      status: "IN_PROGRESS",
    });

    await updateTaskStatus(
      { projectId: "proj-1", taskId: "task-1", status: "IN_PROGRESS" },
      "user-1",
    );

    expect(eventBus.emit).toHaveBeenCalledWith("project.taskUpdated", expect.any(Object));
  });

  it("throws when task assignment not found", async () => {
    projectFindUnique.mockResolvedValue(mockProject);
    taskAssignmentFindUnique.mockResolvedValue(null);

    await expect(
      updateTaskStatus(
        { projectId: "proj-1", taskId: "nonexistent", status: "COMPLETED" },
        "user-1",
      ),
    ).rejects.toThrow(ProjectServiceError);
  });
});

describe("checkMandatoryTasksComplete", () => {
  it("returns true when all mandatory tasks are complete", async () => {
    activityTaskFindMany.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
    taskAssignmentCount.mockResolvedValue(2);

    const result = await checkMandatoryTasksComplete("proj-1", "phase-1");

    expect(result.allComplete).toBe(true);
    expect(result.totalMandatory).toBe(2);
    expect(result.completedMandatory).toBe(2);
  });

  it("returns false when some mandatory tasks are incomplete", async () => {
    activityTaskFindMany.mockResolvedValue([{ id: "task-1" }, { id: "task-2" }]);
    taskAssignmentCount.mockResolvedValue(1);

    const result = await checkMandatoryTasksComplete("proj-1", "phase-1");

    expect(result.allComplete).toBe(false);
    expect(result.completedMandatory).toBe(1);
  });

  it("returns true when no mandatory tasks exist", async () => {
    activityTaskFindMany.mockResolvedValue([]);

    const result = await checkMandatoryTasksComplete("proj-1", "phase-1");

    expect(result.allComplete).toBe(true);
    expect(result.totalMandatory).toBe(0);
  });
});
