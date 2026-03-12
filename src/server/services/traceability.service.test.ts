import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getIdeaLineage,
  getProjectSourceDetails,
  getDashboardStats,
  getPipelineStats,
  TraceabilityServiceError,
} from "./traceability.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    processDefinition: {
      findMany: vi.fn(),
    },
    evaluationSessionIdea: {
      count: vi.fn(),
    },
    concept: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { prisma } = vi.mocked(await import("@/server/lib/prisma"));

describe("traceability.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getIdeaLineage", () => {
    it("should return lineage nodes for an idea with campaign origin", async () => {
      (prisma.idea.findUnique as Mock).mockResolvedValue({
        id: "idea1",
        title: "Test Idea",
        status: "SELECTED_IMPLEMENTATION",
        campaignId: "camp1",
        campaign: { id: "camp1", title: "Innovation Campaign", status: "CLOSED" },
        evaluationSessionIdeas: [],
        sourceForConcepts: [],
        sourceForProjects: [],
      });

      const result = await getIdeaLineage({ ideaId: "idea1" });

      expect(result.ideaId).toBe("idea1");
      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]).toMatchObject({
        type: "campaign",
        id: "camp1",
        title: "Innovation Campaign",
        url: "/campaigns/camp1",
      });
    });

    it("should include evaluation, concept, and project nodes", async () => {
      (prisma.idea.findUnique as Mock).mockResolvedValue({
        id: "idea1",
        title: "Test Idea",
        status: "SELECTED_IMPLEMENTATION",
        campaignId: "camp1",
        campaign: { id: "camp1", title: "Campaign", status: "EVALUATION" },
        evaluationSessionIdeas: [
          {
            session: {
              id: "eval1",
              title: "Q1 Evaluation",
              status: "COMPLETED",
              campaignId: "camp1",
            },
          },
        ],
        sourceForConcepts: [
          {
            id: "concept1",
            title: "Concept A",
            status: "APPROVED",
            convertedProject: { id: "proj1", title: "Project Alpha", status: "ACTIVE" },
          },
        ],
        sourceForProjects: [],
      });

      const result = await getIdeaLineage({ ideaId: "idea1" });

      expect(result.nodes).toHaveLength(4);
      expect(result.nodes[0]?.type).toBe("campaign");
      expect(result.nodes[1]?.type).toBe("evaluation");
      expect(result.nodes[2]?.type).toBe("concept");
      expect(result.nodes[3]?.type).toBe("project");
    });

    it("should not duplicate projects linked via both concept and direct", async () => {
      (prisma.idea.findUnique as Mock).mockResolvedValue({
        id: "idea1",
        title: "Test Idea",
        status: "SELECTED_IMPLEMENTATION",
        campaignId: "camp1",
        campaign: { id: "camp1", title: "Campaign", status: "CLOSED" },
        evaluationSessionIdeas: [],
        sourceForConcepts: [
          {
            id: "concept1",
            title: "Concept",
            status: "APPROVED",
            convertedProject: { id: "proj1", title: "Project", status: "ACTIVE" },
          },
        ],
        sourceForProjects: [{ id: "proj1", title: "Project", status: "ACTIVE" }],
      });

      const result = await getIdeaLineage({ ideaId: "idea1" });

      const projectNodes = result.nodes.filter((n) => n.type === "project");
      expect(projectNodes).toHaveLength(1);
    });

    it("should throw when idea not found", async () => {
      (prisma.idea.findUnique as Mock).mockResolvedValue(null);

      await expect(getIdeaLineage({ ideaId: "nonexistent" })).rejects.toThrow(
        TraceabilityServiceError,
      );
    });
  });

  describe("getProjectSourceDetails", () => {
    it("should return source idea details with engagement metrics", async () => {
      (prisma.project.findUnique as Mock).mockResolvedValue({
        id: "proj1",
        sourceIdea: {
          id: "idea1",
          title: "Innovative Idea",
          status: "SELECTED_IMPLEMENTATION",
          contributorId: "user1",
          contributor: { id: "user1", name: "Jane Doe", email: "jane@test.com", image: null },
          campaign: { id: "camp1", title: "Q1 Campaign" },
          submittedAt: new Date("2026-01-15"),
          likesCount: 42,
          commentsCount: 12,
          viewsCount: 200,
        },
        sourceConcept: null,
      });

      const result = await getProjectSourceDetails("proj1");

      expect(result.sourceIdea).not.toBeNull();
      expect(result.sourceIdea?.title).toBe("Innovative Idea");
      expect(result.sourceIdea?.author.name).toBe("Jane Doe");
      expect(result.sourceIdea?.likesCount).toBe(42);
      expect(result.sourceIdea?.campaign?.title).toBe("Q1 Campaign");
    });

    it("should return null source when no linked idea", async () => {
      (prisma.project.findUnique as Mock).mockResolvedValue({
        id: "proj1",
        sourceIdea: null,
        sourceConcept: null,
      });

      const result = await getProjectSourceDetails("proj1");

      expect(result.sourceIdea).toBeNull();
      expect(result.sourceConcept).toBeNull();
    });

    it("should throw when project not found", async () => {
      (prisma.project.findUnique as Mock).mockResolvedValue(null);

      await expect(getProjectSourceDetails("nonexistent")).rejects.toThrow(
        TraceabilityServiceError,
      );
    });
  });

  describe("getDashboardStats", () => {
    it("should return aggregated dashboard statistics", async () => {
      (prisma.project.groupBy as Mock)
        .mockResolvedValueOnce([
          { status: "ACTIVE", _count: { id: 5 } },
          { status: "COMPLETED", _count: { id: 3 } },
        ])
        .mockResolvedValueOnce([{ processDefinitionId: "pd1", _count: { id: 8 } }]);

      (prisma.project.count as Mock).mockResolvedValue(5);

      (prisma.project.findMany as Mock).mockResolvedValue([
        {
          id: "p1",
          title: "Project 1",
          status: "ACTIVE",
          createdAt: new Date("2026-01-01"),
          processDefinition: { id: "pd1", name: "Stage-Gate" },
          currentPhase: { id: "ph1", name: "Discovery" },
          phaseInstances: [
            {
              id: "pi1",
              status: "COMPLETED",
              phase: { id: "ph1", name: "Discovery", position: 1 },
              plannedStartAt: null,
              plannedEndAt: null,
              actualStartAt: new Date("2026-01-01"),
              actualEndAt: new Date("2026-02-01"),
            },
            {
              id: "pi2",
              status: "ELABORATION",
              phase: { id: "ph2", name: "Development", position: 2 },
              plannedStartAt: null,
              plannedEndAt: null,
              actualStartAt: null,
              actualEndAt: null,
            },
          ],
        },
      ]);

      (prisma.processDefinition.findMany as Mock).mockResolvedValue([
        { id: "pd1", name: "Stage-Gate" },
      ]);

      const result = await getDashboardStats({});

      expect(result.totalProjects).toBe(8);
      expect(result.totalActive).toBe(5);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byProcessDefinition).toHaveLength(1);
      expect(result.phaseCompletionRate).toBe(50);
      expect(result.timeline).toHaveLength(1);
    });
  });

  describe("getPipelineStats", () => {
    it("should return pipeline stages and conversion rates", async () => {
      (prisma.idea.count as Mock)
        .mockResolvedValueOnce(100) // submitted
        .mockResolvedValueOnce(20); // selected

      (prisma.evaluationSessionIdea.count as Mock).mockResolvedValue(50);
      (prisma.concept.count as Mock).mockResolvedValue(10);
      (prisma.project.count as Mock).mockResolvedValueOnce(8).mockResolvedValueOnce(3);

      const result = await getPipelineStats({});

      expect(result.stages).toHaveLength(6);
      expect(result.stages[0]).toEqual({ name: "Ideas Submitted", count: 100 });
      expect(result.stages[4]).toEqual({ name: "Projects", count: 8 });

      expect(result.conversionRates).toHaveLength(5);
      expect(result.conversionRates[0]).toEqual({
        from: "Ideas Submitted",
        to: "Evaluated",
        rate: 50,
      });
    });
  });
});
