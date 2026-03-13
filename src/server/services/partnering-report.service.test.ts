import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { getUseCasePipelineFunnel, getOrganizationActivity } from "./partnering-report.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    useCase: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    organization: {
      findMany: vi.fn(),
    },
    useCaseOrganization: {
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

const useCaseGroupBy = prisma.useCase.groupBy as unknown as Mock;
const useCaseFindMany = prisma.useCase.findMany as unknown as Mock;
const organizationFindMany = prisma.organization.findMany as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getUseCasePipelineFunnel", () => {
  it("returns use case pipeline funnel with all statuses", async () => {
    useCaseGroupBy.mockResolvedValue([
      { status: "IDENTIFIED", _count: { id: 10 } },
      { status: "QUALIFICATION", _count: { id: 5 } },
      { status: "EVALUATION", _count: { id: 3 } },
      { status: "PILOT", _count: { id: 2 } },
      { status: "PARTNERSHIP", _count: { id: 1 } },
    ]);

    useCaseFindMany.mockResolvedValue([
      {
        status: "IDENTIFIED",
        organizations: [{ organization: { id: "org-1", name: "TechCorp" } }],
      },
      {
        status: "EVALUATION",
        organizations: [{ organization: { id: "org-1", name: "TechCorp" } }],
      },
      {
        status: "PILOT",
        organizations: [{ organization: { id: "org-2", name: "InnovateCo" } }],
      },
    ]);

    const result = await getUseCasePipelineFunnel({});

    expect(result.totalUseCases).toBe(21);
    expect(result.funnel).toHaveLength(6);

    const identified = result.funnel.find((f) => f.status === "IDENTIFIED");
    expect(identified?.count).toBe(10);

    const partnership = result.funnel.find((f) => f.status === "PARTNERSHIP");
    expect(partnership?.count).toBe(1);

    const archived = result.funnel.find((f) => f.status === "ARCHIVED");
    expect(archived?.count).toBe(0);

    expect(result.byOrganization).toHaveLength(2);
    const techCorp = result.byOrganization.find((o) => o.organizationName === "TechCorp");
    expect(techCorp?.useCaseCount).toBe(2);
  });

  it("returns empty funnel when no use cases exist", async () => {
    useCaseGroupBy.mockResolvedValue([]);
    useCaseFindMany.mockResolvedValue([]);

    const result = await getUseCasePipelineFunnel({});

    expect(result.totalUseCases).toBe(0);
    expect(result.funnel).toHaveLength(6);
    expect(result.funnel.every((f) => f.count === 0)).toBe(true);
    expect(result.byOrganization).toHaveLength(0);
  });

  it("filters by organization IDs", async () => {
    useCaseGroupBy.mockResolvedValue([]);
    useCaseFindMany.mockResolvedValue([]);

    await getUseCasePipelineFunnel({ organizationIds: ["org-1"] });

    expect(useCaseGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizations: { some: { organizationId: { in: ["org-1"] } } },
        }),
      }),
    );
  });
});

describe("getOrganizationActivity", () => {
  it("returns organization activity metrics", async () => {
    organizationFindMany.mockResolvedValue([
      {
        id: "org-1",
        name: "TechCorp",
        industry: "Technology",
        relationshipStatus: "PARTNERSHIP",
        ndaStatus: "SIGNED",
        contacts: [{ id: "c-1" }, { id: "c-2" }],
        managers: [{ id: "m-1" }],
        useCases: [{ useCase: { status: "PARTNERSHIP" } }, { useCase: { status: "PILOT" } }],
      },
      {
        id: "org-2",
        name: "InnovateCo",
        industry: "Biotech",
        relationshipStatus: "EVALUATION",
        ndaStatus: "NONE",
        contacts: [{ id: "c-3" }],
        managers: [],
        useCases: [{ useCase: { status: "IDENTIFIED" } }],
      },
    ]);

    const result = await getOrganizationActivity({});

    expect(result.organizations).toHaveLength(2);
    expect(result.totals.totalOrganizations).toBe(2);
    expect(result.totals.totalContacts).toBe(3);
    expect(result.totals.totalUseCases).toBe(3);
    expect(result.totals.relationshipStatusBreakdown["PARTNERSHIP"]).toBe(1);
    expect(result.totals.relationshipStatusBreakdown["EVALUATION"]).toBe(1);

    const techCorp = result.organizations.find((o) => o.organizationName === "TechCorp");
    expect(techCorp?.contactCount).toBe(2);
    expect(techCorp?.useCaseCount).toBe(2);
    expect(techCorp?.useCaseStatusBreakdown["PARTNERSHIP"]).toBe(1);
    expect(techCorp?.useCaseStatusBreakdown["PILOT"]).toBe(1);
    expect(techCorp?.managerCount).toBe(1);
  });

  it("returns empty results when no organizations exist", async () => {
    organizationFindMany.mockResolvedValue([]);

    const result = await getOrganizationActivity({});

    expect(result.organizations).toHaveLength(0);
    expect(result.totals.totalOrganizations).toBe(0);
    expect(result.totals.totalContacts).toBe(0);
    expect(result.totals.totalUseCases).toBe(0);
  });

  it("filters by relationship status", async () => {
    organizationFindMany.mockResolvedValue([]);

    await getOrganizationActivity({ relationshipStatus: "PARTNERSHIP" });

    expect(organizationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          relationshipStatus: "PARTNERSHIP",
        }),
      }),
    );
  });

  it("filters by organization IDs", async () => {
    organizationFindMany.mockResolvedValue([]);

    await getOrganizationActivity({ organizationIds: ["org-1", "org-2"] });

    expect(organizationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["org-1", "org-2"] },
        }),
      }),
    );
  });
});
