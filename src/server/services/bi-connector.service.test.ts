import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  configureConnector,
  listConnectors,
  getConnectorById,
  refreshDataset,
  deleteConnector,
  getEndpoints,
  getIdeasDataset,
  getCampaignsDataset,
  getEvaluationsDataset,
  getProjectsDataset,
  getDatasetMetadata,
  formatAsCsv,
  BiConnectorServiceError,
} from "./bi-connector.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    biConnector: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    idea: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    evaluationSession: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      count: vi.fn(),
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
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const mockConnector = {
  id: "conn-1",
  spaceId: "space-1",
  provider: "TABLEAU",
  name: "My Tableau",
  refreshToken: null,
  lastRefreshedAt: null,
  isActive: true,
  datasetConfig: { ideas: true, campaigns: true, evaluations: false, projects: false },
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: { id: "user-1", name: "Admin", email: "admin@test.com" },
  space: { id: "space-1", name: "Test Space" },
};

describe("BiConnectorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("configureConnector", () => {
    it("should create a new BI connector", async () => {
      (prisma.biConnector.create as Mock).mockResolvedValue(mockConnector);

      const result = await configureConnector(
        {
          spaceId: "space-1",
          provider: "TABLEAU",
          name: "My Tableau",
          datasetConfig: { ideas: true, campaigns: true, evaluations: false, projects: false },
        },
        "user-1",
      );

      expect(result).toEqual(mockConnector);
      expect(prisma.biConnector.create).toHaveBeenCalledWith({
        data: {
          spaceId: "space-1",
          provider: "TABLEAU",
          name: "My Tableau",
          datasetConfig: { ideas: true, campaigns: true, evaluations: false, projects: false },
          createdById: "user-1",
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          space: { select: { id: true, name: true } },
        },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "biConnector.configured",
        expect.objectContaining({
          entity: "BiConnector",
          entityId: "conn-1",
          actor: "user-1",
        }),
      );
    });
  });

  describe("listConnectors", () => {
    it("should return paginated connectors", async () => {
      (prisma.biConnector.findMany as Mock).mockResolvedValue([mockConnector]);

      const result = await listConnectors({ spaceId: "space-1", limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should return nextCursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockConnector,
        id: `conn-${String(i)}`,
      }));
      (prisma.biConnector.findMany as Mock).mockResolvedValue(items);

      const result = await listConnectors({ spaceId: "space-1", limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("conn-20");
    });
  });

  describe("getConnectorById", () => {
    it("should return connector by id", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);

      const result = await getConnectorById("conn-1");
      expect(result).toEqual(mockConnector);
    });

    it("should throw NOT_FOUND when connector does not exist", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(null);

      await expect(getConnectorById("conn-999")).rejects.toThrow(BiConnectorServiceError);
      await expect(getConnectorById("conn-999")).rejects.toThrow("BI connector not found");
    });
  });

  describe("refreshDataset", () => {
    it("should refresh dataset and update timestamp", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);
      const updatedConnector = { ...mockConnector, lastRefreshedAt: new Date() };
      (prisma.biConnector.update as Mock).mockResolvedValue(updatedConnector);

      const result = await refreshDataset({ id: "conn-1" }, "user-1");

      expect(result.lastRefreshedAt).toBeDefined();
      expect(eventBus.emit).toHaveBeenCalledWith(
        "biConnector.refreshed",
        expect.objectContaining({ entityId: "conn-1" }),
      );
    });

    it("should throw NOT_FOUND when connector does not exist", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(null);

      await expect(refreshDataset({ id: "conn-999" }, "user-1")).rejects.toThrow(
        "BI connector not found",
      );
    });

    it("should throw INACTIVE when connector is disabled", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue({
        ...mockConnector,
        isActive: false,
      });

      await expect(refreshDataset({ id: "conn-1" }, "user-1")).rejects.toThrow(
        "BI connector is inactive",
      );
    });

    it("should throw RATE_LIMITED when refreshed too recently", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue({
        ...mockConnector,
        lastRefreshedAt: new Date(), // just now
      });

      await expect(refreshDataset({ id: "conn-1" }, "user-1")).rejects.toThrow(
        /Refresh rate limited/,
      );
    });
  });

  describe("deleteConnector", () => {
    it("should delete a connector", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);
      (prisma.biConnector.delete as Mock).mockResolvedValue(mockConnector);

      const result = await deleteConnector({ id: "conn-1" }, "user-1");
      expect(result).toEqual({ success: true });
    });

    it("should throw NOT_FOUND when connector does not exist", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(null);

      await expect(deleteConnector({ id: "conn-999" }, "user-1")).rejects.toThrow(
        "BI connector not found",
      );
    });
  });

  describe("getEndpoints", () => {
    it("should return endpoint URLs", () => {
      const endpoints = getEndpoints({ id: "conn-1" });

      expect(endpoints.ideas).toContain("/api/bi/conn-1/ideas");
      expect(endpoints.campaigns).toContain("/api/bi/conn-1/campaigns");
      expect(endpoints.evaluations).toContain("/api/bi/conn-1/evaluations");
      expect(endpoints.projects).toContain("/api/bi/conn-1/projects");
      expect(endpoints.metadata).toContain("/api/bi/conn-1/metadata");
    });
  });

  describe("getIdeasDataset", () => {
    it("should return ideas in tabular format", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);
      const mockIdea = {
        id: "idea-1",
        title: "Test Idea",
        status: "SUBMITTED",
        likesCount: 5,
        commentsCount: 2,
        viewsCount: 10,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        contributor: { id: "user-1", name: "Jane", email: "jane@test.com" },
        campaign: { id: "camp-1", title: "Campaign 1" },
      };
      (prisma.idea.findMany as Mock).mockResolvedValue([mockIdea]);
      (prisma.idea.count as Mock).mockResolvedValue(1);

      const result = await getIdeasDataset("conn-1", { limit: 100, offset: 0 });

      expect(result.columns).toBeDefined();
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(
        expect.objectContaining({
          id: "idea-1",
          title: "Test Idea",
          status: "SUBMITTED",
          likes_count: 5,
        }),
      );
      expect(result.totalCount).toBe(1);
    });
  });

  describe("getCampaignsDataset", () => {
    it("should return campaigns in tabular format", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);
      const mockCampaign = {
        id: "camp-1",
        title: "Campaign 1",
        status: "SUBMISSION",
        submissionType: "CALL_FOR_IDEAS",
        submissionCloseDate: new Date("2026-02-01"),
        votingCloseDate: null,
        launchedAt: new Date("2026-01-01"),
        closedAt: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        createdBy: { id: "user-1", name: "Admin" },
        _count: { ideas: 10, members: 5 },
      };
      (prisma.campaign.findMany as Mock).mockResolvedValue([mockCampaign]);
      (prisma.campaign.count as Mock).mockResolvedValue(1);

      const result = await getCampaignsDataset("conn-1", { limit: 100, offset: 0 });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(
        expect.objectContaining({
          id: "camp-1",
          idea_count: 10,
          member_count: 5,
        }),
      );
    });
  });

  describe("getEvaluationsDataset", () => {
    it("should return evaluations in tabular format", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);
      const mockSession = {
        id: "eval-1",
        title: "Eval Session 1",
        status: "ACTIVE",
        type: "SCORECARD",
        mode: "STANDARD",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        campaign: { id: "camp-1", title: "Campaign 1" },
        _count: { evaluators: 3, ideas: 10, responses: 25 },
      };
      (prisma.evaluationSession.findMany as Mock).mockResolvedValue([mockSession]);
      (prisma.evaluationSession.count as Mock).mockResolvedValue(1);

      const result = await getEvaluationsDataset("conn-1", { limit: 100, offset: 0 });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(
        expect.objectContaining({
          id: "eval-1",
          evaluator_count: 3,
          response_count: 25,
        }),
      );
    });
  });

  describe("getProjectsDataset", () => {
    it("should return projects in tabular format", async () => {
      (prisma.biConnector.findUnique as Mock).mockResolvedValue(mockConnector);
      const mockProject = {
        id: "proj-1",
        title: "Project 1",
        status: "ACTIVE",
        isConfidential: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        createdBy: { id: "user-1", name: "Admin" },
        processDefinition: { id: "pd-1", name: "Default Process" },
        _count: { teamMembers: 5, taskAssignments: 20 },
      };
      (prisma.project.findMany as Mock).mockResolvedValue([mockProject]);
      (prisma.project.count as Mock).mockResolvedValue(1);

      const result = await getProjectsDataset("conn-1", { limit: 100, offset: 0 });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual(
        expect.objectContaining({
          id: "proj-1",
          team_member_count: 5,
        }),
      );
    });
  });

  describe("getDatasetMetadata", () => {
    it("should return metadata for all datasets", () => {
      const metadata = getDatasetMetadata("conn-1");

      expect(metadata.connectorId).toBe("conn-1");
      expect(metadata.datasets.ideas).toBeDefined();
      expect(metadata.datasets.campaigns).toBeDefined();
      expect(metadata.datasets.evaluations).toBeDefined();
      expect(metadata.datasets.projects).toBeDefined();
    });
  });

  describe("formatAsCsv", () => {
    it("should format data as CSV", () => {
      const columns = [
        { name: "id", type: "string", description: "ID" },
        { name: "title", type: "string", description: "Title" },
        { name: "count", type: "integer", description: "Count" },
      ];
      const rows = [
        { id: "1", title: "First", count: 10 },
        { id: "2", title: "Second", count: 20 },
      ];

      const csv = formatAsCsv(columns, rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("id,title,count");
      expect(lines[1]).toBe("1,First,10");
      expect(lines[2]).toBe("2,Second,20");
    });

    it("should escape CSV fields with commas and quotes", () => {
      const columns = [{ name: "text", type: "string", description: "Text" }];
      const rows = [{ text: 'Hello, "World"' }];

      const csv = formatAsCsv(columns, rows);
      const lines = csv.split("\n");

      expect(lines[1]).toBe('"Hello, ""World"""');
    });

    it("should handle empty rows", () => {
      const columns = [{ name: "id", type: "string", description: "ID" }];
      const rows: Record<string, unknown>[] = [];

      const csv = formatAsCsv(columns, rows);
      expect(csv).toBe("id");
    });
  });
});
