import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getPhaseInstances,
  requestGateReview,
  submitGateDecision,
  updatePhaseDates,
  ProjectServiceError,
} from "./project.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectPhaseInstance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    projectTeamMember: {
      findFirst: vi.fn(),
    },
    gateDecision: {
      create: vi.fn(),
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
const projectUpdate = prisma.project.update as unknown as Mock;
const phaseInstanceFindUnique = prisma.projectPhaseInstance.findUnique as unknown as Mock;
const phaseInstanceFindMany = prisma.projectPhaseInstance.findMany as unknown as Mock;
const phaseInstanceUpdate = prisma.projectPhaseInstance.update as unknown as Mock;
const teamMemberFindFirst = prisma.projectTeamMember.findFirst as unknown as Mock;
const gateDecisionCreate = prisma.gateDecision.create as unknown as Mock;

const mockPhaseInstances = [
  {
    id: "pi-1",
    projectId: "proj-1",
    phaseId: "phase-1",
    position: 0,
    status: "ELABORATION",
    plannedStartAt: null,
    plannedEndAt: null,
    actualStartAt: new Date("2026-01-01"),
    actualEndAt: null,
    reworkFeedback: null,
    postponeUntil: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    phase: { id: "phase-1", name: "Discovery", description: null, plannedDurationDays: 30 },
    gateDecisions: [],
  },
  {
    id: "pi-2",
    projectId: "proj-1",
    phaseId: "phase-2",
    position: 1,
    status: "SKIPPED",
    plannedStartAt: null,
    plannedEndAt: null,
    actualStartAt: null,
    actualEndAt: null,
    reworkFeedback: null,
    postponeUntil: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    phase: { id: "phase-2", name: "Development", description: null, plannedDurationDays: 60 },
    gateDecisions: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPhaseInstances", () => {
  it("returns phase instances for a project", async () => {
    projectFindUnique.mockResolvedValue({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    const result = await getPhaseInstances({ projectId: "proj-1" });

    expect(result).toHaveLength(2);
    expect(result[0]?.phase.name).toBe("Discovery");
    expect(result[0]?.status).toBe("ELABORATION");
    expect(result[1]?.status).toBe("SKIPPED");
  });

  it("throws when project not found", async () => {
    projectFindUnique.mockResolvedValue(null);

    await expect(getPhaseInstances({ projectId: "nonexistent" })).rejects.toThrow(
      ProjectServiceError,
    );
  });
});

describe("requestGateReview", () => {
  it("transitions current phase to GATE_REVIEW", async () => {
    projectFindUnique.mockResolvedValueOnce({
      id: "proj-1",
      status: "ACTIVE",
      currentPhaseId: "phase-1",
      currentPhase: { id: "phase-1" },
    });
    phaseInstanceFindUnique.mockResolvedValue({
      id: "pi-1",
      status: "ELABORATION",
      phaseId: "phase-1",
    });
    phaseInstanceUpdate.mockResolvedValue({});
    projectFindUnique.mockResolvedValueOnce({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    await requestGateReview({ projectId: "proj-1" }, "user-1");

    expect(phaseInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pi-1" },
        data: { status: "GATE_REVIEW" },
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith("project.gateReviewRequested", expect.any(Object));
  });

  it("throws when project is not active", async () => {
    projectFindUnique.mockResolvedValue({
      id: "proj-1",
      status: "COMPLETED",
      currentPhaseId: "phase-1",
    });

    await expect(requestGateReview({ projectId: "proj-1" }, "user-1")).rejects.toThrow(
      "active projects",
    );
  });

  it("throws when phase is already in gate review", async () => {
    projectFindUnique.mockResolvedValue({
      id: "proj-1",
      status: "ACTIVE",
      currentPhaseId: "phase-1",
      currentPhase: { id: "phase-1" },
    });
    phaseInstanceFindUnique.mockResolvedValue({
      id: "pi-1",
      status: "GATE_REVIEW",
    });

    await expect(requestGateReview({ projectId: "proj-1" }, "user-1")).rejects.toThrow(
      "ELABORATION",
    );
  });
});

describe("submitGateDecision", () => {
  const baseProject = {
    id: "proj-1",
    status: "ACTIVE",
    currentPhaseId: "phase-1",
    processDefinition: {
      phases: [
        { id: "phase-1", position: 0 },
        { id: "phase-2", position: 1 },
      ],
    },
  };

  it("forwards to next phase", async () => {
    projectFindUnique.mockResolvedValueOnce(baseProject);
    phaseInstanceFindUnique.mockResolvedValueOnce({
      id: "pi-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      position: 0,
      status: "GATE_REVIEW",
    });
    teamMemberFindFirst.mockResolvedValue({ id: "tm-gk", role: "GATEKEEPER" });
    gateDecisionCreate.mockResolvedValue({ id: "gd-1" });
    phaseInstanceUpdate.mockResolvedValue({});
    projectUpdate.mockResolvedValue({});
    projectFindUnique.mockResolvedValueOnce({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    await submitGateDecision(
      { projectId: "proj-1", phaseInstanceId: "pi-1", decision: "FORWARD" },
      "user-gk",
    );

    expect(gateDecisionCreate).toHaveBeenCalledOnce();
    expect(eventBus.emit).toHaveBeenCalledWith("project.gateDecision", expect.any(Object));
    expect(eventBus.emit).toHaveBeenCalledWith("project.phaseAdvanced", expect.any(Object));
  });

  it("completes project when forwarding from last phase", async () => {
    const lastPhaseProject = {
      ...baseProject,
      processDefinition: {
        phases: [{ id: "phase-1", position: 0 }],
      },
    };
    projectFindUnique.mockResolvedValueOnce(lastPhaseProject);
    phaseInstanceFindUnique.mockResolvedValueOnce({
      id: "pi-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      position: 0,
      status: "GATE_REVIEW",
    });
    teamMemberFindFirst.mockResolvedValue({ id: "tm-gk", role: "GATEKEEPER" });
    gateDecisionCreate.mockResolvedValue({ id: "gd-1" });
    phaseInstanceUpdate.mockResolvedValue({});
    projectUpdate.mockResolvedValue({});
    projectFindUnique.mockResolvedValueOnce({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    await submitGateDecision(
      { projectId: "proj-1", phaseInstanceId: "pi-1", decision: "FORWARD" },
      "user-gk",
    );

    expect(projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "COMPLETED", currentPhaseId: null },
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith("project.completed", expect.any(Object));
  });

  it("sends phase back to elaboration on rework", async () => {
    projectFindUnique.mockResolvedValueOnce(baseProject);
    phaseInstanceFindUnique.mockResolvedValueOnce({
      id: "pi-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      position: 0,
      status: "GATE_REVIEW",
    });
    teamMemberFindFirst.mockResolvedValue({ id: "tm-gk", role: "GATEKEEPER" });
    gateDecisionCreate.mockResolvedValue({ id: "gd-1" });
    phaseInstanceUpdate.mockResolvedValue({});
    projectFindUnique.mockResolvedValueOnce({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    await submitGateDecision(
      {
        projectId: "proj-1",
        phaseInstanceId: "pi-1",
        decision: "REWORK",
        feedback: "Needs more research",
      },
      "user-gk",
    );

    expect(phaseInstanceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "ELABORATION", reworkFeedback: "Needs more research" },
      }),
    );
  });

  it("terminates the project", async () => {
    projectFindUnique.mockResolvedValueOnce(baseProject);
    phaseInstanceFindUnique.mockResolvedValueOnce({
      id: "pi-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      position: 0,
      status: "GATE_REVIEW",
    });
    teamMemberFindFirst.mockResolvedValue({ id: "tm-gk", role: "GATEKEEPER" });
    gateDecisionCreate.mockResolvedValue({ id: "gd-1" });
    projectUpdate.mockResolvedValue({});
    projectFindUnique.mockResolvedValueOnce({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    await submitGateDecision(
      {
        projectId: "proj-1",
        phaseInstanceId: "pi-1",
        decision: "TERMINATE",
        feedback: "Budget cut",
      },
      "user-gk",
    );

    expect(projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "TERMINATED" } }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith("project.terminated", expect.any(Object));
  });

  it("throws when user is not a gatekeeper", async () => {
    projectFindUnique.mockResolvedValue(baseProject);
    phaseInstanceFindUnique.mockResolvedValue({
      id: "pi-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      status: "GATE_REVIEW",
    });
    teamMemberFindFirst.mockResolvedValue(null);

    await expect(
      submitGateDecision(
        { projectId: "proj-1", phaseInstanceId: "pi-1", decision: "FORWARD" },
        "user-non-gk",
      ),
    ).rejects.toThrow("gatekeepers");
  });

  it("throws when phase is not in gate review", async () => {
    projectFindUnique.mockResolvedValue(baseProject);
    phaseInstanceFindUnique.mockResolvedValue({
      id: "pi-1",
      projectId: "proj-1",
      phaseId: "phase-1",
      status: "ELABORATION",
    });

    await expect(
      submitGateDecision(
        { projectId: "proj-1", phaseInstanceId: "pi-1", decision: "FORWARD" },
        "user-gk",
      ),
    ).rejects.toThrow("GATE_REVIEW");
  });
});

describe("updatePhaseDates", () => {
  it("updates planned dates", async () => {
    phaseInstanceFindUnique.mockResolvedValue({ id: "pi-1", projectId: "proj-1" });
    phaseInstanceUpdate.mockResolvedValue({});
    projectFindUnique.mockResolvedValue({ id: "proj-1" });
    phaseInstanceFindMany.mockResolvedValue(mockPhaseInstances);

    await updatePhaseDates(
      {
        phaseInstanceId: "pi-1",
        plannedStartAt: "2026-02-01T00:00:00.000Z",
        plannedEndAt: "2026-03-01T00:00:00.000Z",
      },
      "user-1",
    );

    expect(phaseInstanceUpdate).toHaveBeenCalledOnce();
  });

  it("throws when phase instance not found", async () => {
    phaseInstanceFindUnique.mockResolvedValue(null);

    await expect(updatePhaseDates({ phaseInstanceId: "nonexistent" }, "user-1")).rejects.toThrow(
      ProjectServiceError,
    );
  });
});
