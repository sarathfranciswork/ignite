import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockSearchOrganizations, mockGetOrganization } = vi.hoisted(
  () => ({
    mockPrisma: {
      organization: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      organizationActivity: {
        create: vi.fn(),
      },
    },
    mockSearchOrganizations: vi.fn(),
    mockGetOrganization: vi.fn(),
  }),
);

vi.mock("../server/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../server/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../server/lib/crunchbase-client", () => ({
  CrunchbaseClient: vi.fn().mockImplementation(() => ({
    searchOrganizations: mockSearchOrganizations,
    getOrganization: mockGetOrganization,
    getOrganizationForEnrichment: mockGetOrganization,
  })),
  CrunchbaseNotConfiguredError: class extends Error {
    name = "CrunchbaseNotConfiguredError";
    constructor() {
      super("Crunchbase API key is not configured");
    }
  },
}));

import {
  listOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  archiveOrganization,
  searchExternalOrganizations,
  importExternalOrganization,
  enrichExistingOrganization,
} from "../server/services/partner.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listOrganizations", () => {
  it("should return paginated organizations", async () => {
    const mockOrgs = [
      { id: "org-1", name: "Org 1", isArchived: false },
      { id: "org-2", name: "Org 2", isArchived: false },
    ];

    mockPrisma.organization.findMany.mockResolvedValue(mockOrgs);
    mockPrisma.organization.count.mockResolvedValue(2);

    const result = await listOrganizations({ page: 1, limit: 20 });

    expect(result.organizations).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("should apply search filter", async () => {
    mockPrisma.organization.findMany.mockResolvedValue([]);
    mockPrisma.organization.count.mockResolvedValue(0);

    await listOrganizations({ search: "test", page: 1, limit: 20 });

    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isArchived: false,
          OR: expect.arrayContaining([
            expect.objectContaining({
              name: expect.objectContaining({ contains: "test" }),
            }),
          ]),
        }),
      }),
    );
  });
});

describe("getOrganizationById", () => {
  it("should return organization with activities", async () => {
    const mockOrg = {
      id: "org-1",
      name: "Test Org",
      activities: [],
    };

    mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

    const result = await getOrganizationById("org-1");
    expect(result.name).toBe("Test Org");
  });

  it("should throw when organization not found", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(getOrganizationById("nonexistent")).rejects.toThrow(
      "Organization not found",
    );
  });
});

describe("createOrganization", () => {
  it("should create organization and log activity", async () => {
    const input = { name: "New Org", websiteUrl: "https://neworg.com" };
    const createdOrg = { id: "org-new", ...input, createdAt: new Date() };

    mockPrisma.organization.create.mockResolvedValue(createdOrg);
    mockPrisma.organizationActivity.create.mockResolvedValue({});

    const result = await createOrganization(input);

    expect(result.id).toBe("org-new");
    expect(mockPrisma.organizationActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-new",
          action: "CREATED",
          source: "manual",
        }),
      }),
    );
  });
});

describe("updateOrganization", () => {
  it("should update organization and track changes", async () => {
    const existing = {
      id: "org-1",
      name: "Old Name",
      industry: "Tech",
    };

    mockPrisma.organization.findUnique.mockResolvedValue(existing);
    mockPrisma.organization.update.mockResolvedValue({
      ...existing,
      name: "New Name",
    });
    mockPrisma.organizationActivity.create.mockResolvedValue({});

    const result = await updateOrganization("org-1", { name: "New Name" });
    expect(result.name).toBe("New Name");

    expect(mockPrisma.organizationActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "UPDATED",
          changes: expect.objectContaining({
            name: { old: "Old Name", new: "New Name" },
          }),
        }),
      }),
    );
  });

  it("should throw when organization not found", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      updateOrganization("nonexistent", { name: "Test" }),
    ).rejects.toThrow("Organization not found");
  });
});

describe("archiveOrganization", () => {
  it("should archive organization and log activity", async () => {
    mockPrisma.organization.update.mockResolvedValue({});
    mockPrisma.organizationActivity.create.mockResolvedValue({});

    await archiveOrganization("org-1");

    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: { isArchived: true, relationshipStatus: "ARCHIVED" },
    });

    expect(mockPrisma.organizationActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ARCHIVED",
        }),
      }),
    );
  });
});

describe("searchExternalOrganizations", () => {
  it("should search Crunchbase and mark already-imported results", async () => {
    mockSearchOrganizations.mockResolvedValue([
      { permalink: "openai", name: "OpenAI", shortDescription: "AI company" },
      {
        permalink: "anthropic",
        name: "Anthropic",
        shortDescription: "AI safety",
      },
    ]);

    mockPrisma.organization.findMany.mockResolvedValue([
      { crunchbaseId: "openai" },
    ]);

    const results = await searchExternalOrganizations("AI", "crunchbase");

    expect(results).toHaveLength(2);
    expect(results[0].alreadyImported).toBe(true);
    expect(results[1].alreadyImported).toBe(false);
  });
});

describe("importExternalOrganization", () => {
  it("should return existing org if already imported by crunchbaseId", async () => {
    const existingOrg = {
      id: "org-existing",
      crunchbaseId: "test-org",
      name: "Test Org",
    };

    mockPrisma.organization.findUnique.mockResolvedValue(existingOrg);

    const result = await importExternalOrganization("test-org", "crunchbase");
    expect(result.id).toBe("org-existing");
    expect(mockGetOrganization).not.toHaveBeenCalled();
  });

  it("should create new organization from Crunchbase data", async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    mockPrisma.organization.findFirst.mockResolvedValue(null);

    mockGetOrganization.mockResolvedValue({
      uuid: "uuid-1",
      permalink: "new-org",
      name: "New Org",
      shortDescription: "A new organization",
      websiteUrl: "https://neworg.com",
      logoUrl: "https://logo.com/new.png",
      industry: "Software",
      location: "San Francisco",
      foundedYear: 2020,
      employeeCount: "51-100",
      fundingStage: "series_a",
      fundingTotal: "$10M",
      managementTeam: [{ name: "John", title: "CEO" }],
    });

    const createdOrg = {
      id: "org-new",
      name: "New Org",
      crunchbaseId: "new-org",
    };
    mockPrisma.organization.create.mockResolvedValue(createdOrg);
    mockPrisma.organizationActivity.create.mockResolvedValue({});

    const result = await importExternalOrganization("new-org", "crunchbase");

    expect(result.id).toBe("org-new");
    expect(mockPrisma.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New Org",
          crunchbaseId: "new-org",
          websiteUrl: "https://neworg.com",
          relationshipStatus: "IDENTIFIED",
        }),
      }),
    );
  });

  it("should enrich existing org if duplicate found by websiteUrl", async () => {
    mockPrisma.organization.findUnique
      .mockResolvedValueOnce(null) // No match by crunchbaseId
      .mockResolvedValueOnce({
        id: "org-dup",
        name: "Dup Org",
        websiteUrl: "https://dup.com",
        crunchbaseId: null,
      }); // Found for enrichment

    mockPrisma.organization.findFirst.mockResolvedValue({
      id: "org-dup",
      name: "Dup Org",
      websiteUrl: "https://dup.com",
    });

    mockGetOrganization.mockResolvedValue({
      uuid: "uuid-dup",
      permalink: "dup-org",
      name: "Dup Org",
      websiteUrl: "https://dup.com",
      shortDescription: "Updated description",
      employeeCount: "100-250",
    });

    mockPrisma.organization.update.mockResolvedValue({
      id: "org-dup",
      name: "Dup Org",
      crunchbaseId: "dup-org",
    });
    mockPrisma.organizationActivity.create.mockResolvedValue({});

    const result = await importExternalOrganization("dup-org", "crunchbase");
    expect(result.id).toBe("org-dup");
  });
});

describe("enrichExistingOrganization", () => {
  it("should update changed fields and log activity", async () => {
    const existing = {
      id: "org-1",
      name: "Test Org",
      employeeCount: "11-50",
      fundingStage: "seed",
      fundingTotal: null,
      industry: "Tech",
      location: "SF",
      logoUrl: null,
      description: null,
      managementTeam: null,
      crunchbaseId: "test-org",
    };

    mockPrisma.organization.findUnique.mockResolvedValue(existing);
    mockPrisma.organization.update.mockResolvedValue({
      ...existing,
      employeeCount: "51-100",
      fundingStage: "series_a",
    });
    mockPrisma.organizationActivity.create.mockResolvedValue({});

    const detail = {
      uuid: "uuid-1",
      permalink: "test-org",
      name: "Test Org",
      shortDescription: "A test org",
      employeeCount: "51-100",
      fundingStage: "series_a",
      fundingTotal: "$5M",
      websiteUrl: "https://test.org",
      logoUrl: null,
      industry: "Tech",
      location: "SF",
      foundedYear: 2020,
      managementTeam: [{ name: "Jane", title: "CEO" }],
    };

    await enrichExistingOrganization("org-1", detail);

    expect(mockPrisma.organization.update).toHaveBeenCalled();
    expect(mockPrisma.organizationActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ENRICHED",
          source: "crunchbase",
        }),
      }),
    );
  });

  it("should skip update when no changes detected", async () => {
    const existing = {
      id: "org-1",
      name: "Test Org",
      employeeCount: "51-100",
      fundingStage: "series_a",
      fundingTotal: "$5M",
      industry: "Tech",
      location: "SF",
      logoUrl: "https://logo.com/test.png",
      description: "A test org",
      managementTeam: null,
      crunchbaseId: "test-org",
    };

    mockPrisma.organization.findUnique.mockResolvedValue(existing);

    const detail = {
      uuid: "uuid-1",
      permalink: "test-org",
      name: "Test Org",
      shortDescription: "A test org",
      employeeCount: "51-100",
      fundingStage: "series_a",
      fundingTotal: "$5M",
      websiteUrl: null,
      logoUrl: "https://logo.com/test.png",
      industry: "Tech",
      location: "SF",
      foundedYear: null,
      managementTeam: null,
    };

    const result = await enrichExistingOrganization("org-1", detail);
    expect(result.id).toBe("org-1");
    expect(mockPrisma.organization.update).not.toHaveBeenCalled();
  });
});
