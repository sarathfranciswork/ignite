import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getPortfolioOverview,
  getProcessAnalysis,
  getPortfolioMatrix,
  PortfolioAnalyzerError,
} from "./portfolio-analyzer.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    processDefinition: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    gateDecision: {
      findMany: vi.fn(),
    },
    projectPhaseInstance: {
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

const { prisma } = await import("@/server/lib/prisma");

const projectFindMany = prisma.project.findMany as unknown as Mock;
const projectGroupBy = prisma.project.groupBy as unknown as Mock;
const projectCount = prisma.project.count as unknown as Mock;
const processDefFindUnique = prisma.processDefinition.findUnique as unknown as Mock;
const processDefFindMany = prisma.processDefinition.findMany as unknown as Mock;
const gateDecisionFindMany = prisma.gateDecision.findMany as unknown as Mock;
const phaseInstanceFindMany = prisma.projectPhaseInstance.findMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPortfolioOverview", () => {
  it("returns overview with status counts and process def breakdown", async () => {
    projectFindMany.mockResolvedValue([
      {
        id: "p1",
        status: "ACTIVE",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-02-01"),
      },
      {
        id: "p2",
        status: "COMPLETED",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-03-01"),
      },
      {
        id: "p3",
        status: "ACTIVE",
        createdAt: new Date("2026-02-01"),
        updatedAt: new Date("2026-03-01"),
      },
    ]);

    projectGroupBy.mockResolvedValue([
      { processDefinitionId: "pd1", _count: { id: 2 } },
      { processDefinitionId: "pd2", _count: { id: 1 } },
    ]);

    processDefFindMany.mockResolvedValue([
      { id: "pd1", name: "Stage-Gate" },
      { id: "pd2", name: "Lean Startup" },
    ]);

    gateDecisionFindMany.mockResolvedValue([
      { decision: "FORWARD" },
      { decision: "FORWARD" },
      { decision: "REWORK" },
    ]);

    const result = await getPortfolioOverview({});

    expect(result.totalProjects).toBe(3);
    expect(result.statusCounts.ACTIVE).toBe(2);
    expect(result.statusCounts.COMPLETED).toBe(1);
    expect(result.statusCounts.ON_HOLD).toBe(0);
    expect(result.statusCounts.TERMINATED).toBe(0);
    expect(result.projectsByProcessDef).toHaveLength(2);
    expect(result.completionRate).toBe(33.3);
    expect(result.gatePassRate).toBe(66.7);
    expect(result.averageTimeDays).not.toBeNull();
  });

  it("returns null rates when no projects exist", async () => {
    projectFindMany.mockResolvedValue([]);
    projectGroupBy.mockResolvedValue([]);
    processDefFindMany.mockResolvedValue([]);
    gateDecisionFindMany.mockResolvedValue([]);

    const result = await getPortfolioOverview({});

    expect(result.totalProjects).toBe(0);
    expect(result.completionRate).toBeNull();
    expect(result.gatePassRate).toBeNull();
    expect(result.averageTimeDays).toBeNull();
  });

  it("filters by processDefinitionId", async () => {
    projectFindMany.mockResolvedValue([]);
    projectGroupBy.mockResolvedValue([]);
    gateDecisionFindMany.mockResolvedValue([]);

    await getPortfolioOverview({ processDefinitionId: "pd1" });

    expect(projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ processDefinitionId: "pd1" }),
      }),
    );
  });

  it("filters by status", async () => {
    projectFindMany.mockResolvedValue([]);
    projectGroupBy.mockResolvedValue([]);
    gateDecisionFindMany.mockResolvedValue([]);

    await getPortfolioOverview({ status: "ACTIVE" });

    expect(projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });
});

describe("getProcessAnalysis", () => {
  it("returns phase-by-phase metrics for a process definition", async () => {
    processDefFindUnique.mockResolvedValue({
      id: "pd1",
      name: "Stage-Gate",
      phases: [
        { id: "phase1", name: "Ideation", position: 0 },
        { id: "phase2", name: "Feasibility", position: 1 },
      ],
    });

    projectCount.mockResolvedValueOnce(5).mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    phaseInstanceFindMany.mockResolvedValue([
      {
        phaseId: "phase1",
        status: "COMPLETED",
        actualStartAt: new Date("2026-01-01"),
        actualEndAt: new Date("2026-01-15"),
        gateDecisions: [{ decision: "FORWARD" }],
      },
      {
        phaseId: "phase1",
        status: "COMPLETED",
        actualStartAt: new Date("2026-02-01"),
        actualEndAt: new Date("2026-02-10"),
        gateDecisions: [{ decision: "REWORK" }],
      },
      {
        phaseId: "phase2",
        status: "COMPLETED",
        actualStartAt: new Date("2026-01-15"),
        actualEndAt: new Date("2026-02-15"),
        gateDecisions: [{ decision: "FORWARD" }],
      },
    ]);

    const result = await getProcessAnalysis({ processDefinitionId: "pd1" });

    expect(result.processDefinitionName).toBe("Stage-Gate");
    expect(result.totalProjects).toBe(5);
    expect(result.completionRate).toBe(40);
    expect(result.terminationRate).toBe(20);
    expect(result.phases).toHaveLength(2);

    const phase1 = result.phases[0];
    expect(phase1.phaseName).toBe("Ideation");
    expect(phase1.instanceCount).toBe(2);
    expect(phase1.gatePassRate).toBe(50);
    expect(phase1.reworkRate).toBe(50);
    expect(phase1.averageDurationDays).not.toBeNull();

    const phase2 = result.phases[1];
    expect(phase2.phaseName).toBe("Feasibility");
    expect(phase2.instanceCount).toBe(1);
    expect(phase2.gatePassRate).toBe(100);
  });

  it("throws when process definition not found", async () => {
    processDefFindUnique.mockResolvedValue(null);

    await expect(getProcessAnalysis({ processDefinitionId: "nonexistent" })).rejects.toThrow(
      PortfolioAnalyzerError,
    );
    await expect(getProcessAnalysis({ processDefinitionId: "nonexistent" })).rejects.toThrow(
      "Process definition not found",
    );
  });

  it("handles phases with no instances", async () => {
    processDefFindUnique.mockResolvedValue({
      id: "pd1",
      name: "Empty Process",
      phases: [{ id: "phase1", name: "Phase 1", position: 0 }],
    });

    projectCount.mockResolvedValue(0);
    phaseInstanceFindMany.mockResolvedValue([]);

    const result = await getProcessAnalysis({ processDefinitionId: "pd1" });

    expect(result.phases[0].instanceCount).toBe(0);
    expect(result.phases[0].averageDurationDays).toBeNull();
    expect(result.phases[0].gatePassRate).toBeNull();
  });
});

describe("getPortfolioMatrix", () => {
  it("returns matrix data for all projects", async () => {
    projectFindMany.mockResolvedValue([
      {
        id: "p1",
        title: "Project Alpha",
        status: "ACTIVE",
        createdAt: new Date("2026-01-01"),
        processDefinition: { name: "Stage-Gate" },
        _count: { teamMembers: 5 },
        phaseInstances: [
          {
            status: "COMPLETED",
            gateDecisions: [{ decision: "FORWARD" }],
          },
          {
            status: "ELABORATION",
            gateDecisions: [],
          },
        ],
      },
    ]);

    const result = await getPortfolioMatrix({});

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Project Alpha");
    expect(result[0].teamSize).toBe(5);
    expect(result[0].phaseCount).toBe(2);
    expect(result[0].completedPhases).toBe(1);
    expect(result[0].progressPercent).toBe(50);
    expect(result[0].gatePassCount).toBe(1);
    expect(result[0].gateTotalCount).toBe(1);
  });

  it("filters by processDefinitionId", async () => {
    projectFindMany.mockResolvedValue([]);

    await getPortfolioMatrix({ processDefinitionId: "pd1" });

    expect(projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ processDefinitionId: "pd1" }),
      }),
    );
  });

  it("handles projects with no phase instances", async () => {
    projectFindMany.mockResolvedValue([
      {
        id: "p1",
        title: "New Project",
        status: "ACTIVE",
        createdAt: new Date("2026-03-01"),
        processDefinition: { name: "Lean" },
        _count: { teamMembers: 1 },
        phaseInstances: [],
      },
    ]);

    const result = await getPortfolioMatrix({});

    expect(result[0].progressPercent).toBe(0);
    expect(result[0].gatePassCount).toBe(0);
    expect(result[0].gateTotalCount).toBe(0);
  });
});
