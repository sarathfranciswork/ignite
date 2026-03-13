import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  searchCrunchbase,
  fetchCrunchbaseOrganization,
  checkDuplicates,
  importSingle,
  importBatch,
  getCrunchbaseStatus,
  CrunchbaseImportError,
} from "./crunchbase-import.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
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

const mockOrg = prisma.organization as unknown as {
  findUnique: Mock;
  findFirst: Mock;
  findMany: Mock;
  create: Mock;
};

describe("crunchbase-import.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("getCrunchbaseStatus", () => {
    it("returns available: false when no API key is set", () => {
      delete process.env.CRUNCHBASE_API_KEY;
      const status = getCrunchbaseStatus();
      expect(status.available).toBe(false);
      expect(status.configured).toBe(false);
    });

    it("returns available: true when API key is set", () => {
      process.env.CRUNCHBASE_API_KEY = "test-key";
      const status = getCrunchbaseStatus();
      expect(status.available).toBe(true);
      expect(status.configured).toBe(true);
    });
  });

  describe("checkDuplicates", () => {
    const sampleOrg = {
      crunchbaseId: "acme-corp",
      name: "Acme Corp",
      description: "A test company",
      websiteUrl: "https://acme.com",
      logoUrl: null,
      industry: "Technology",
      location: "San Francisco, CA",
      foundedYear: 2015,
      employeeCount: "51-100",
      fundingStage: "Series A",
      fundingTotal: "USD 10,000,000",
    };

    it("detects duplicate by crunchbase ID", async () => {
      mockOrg.findUnique.mockResolvedValue({
        id: "existing-id",
        name: "Existing Acme",
      });

      const result = await checkDuplicates(sampleOrg);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe("crunchbase_id");
      expect(result.existingId).toBe("existing-id");
    });

    it("detects duplicate by website URL", async () => {
      mockOrg.findUnique.mockResolvedValue(null);
      mockOrg.findMany.mockResolvedValue([
        { id: "url-match-id", name: "Acme Inc", websiteUrl: "https://www.acme.com" },
      ]);

      const result = await checkDuplicates(sampleOrg);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe("website_url");
      expect(result.existingId).toBe("url-match-id");
    });

    it("detects duplicate by name", async () => {
      mockOrg.findUnique.mockResolvedValue(null);
      mockOrg.findMany.mockResolvedValue([]);
      mockOrg.findFirst.mockResolvedValue({
        id: "name-match-id",
        name: "acme corp",
      });

      const result = await checkDuplicates(sampleOrg);

      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe("name");
      expect(result.existingId).toBe("name-match-id");
    });

    it("returns no duplicate when org is unique", async () => {
      mockOrg.findUnique.mockResolvedValue(null);
      mockOrg.findMany.mockResolvedValue([]);
      mockOrg.findFirst.mockResolvedValue(null);

      const result = await checkDuplicates(sampleOrg);

      expect(result.isDuplicate).toBe(false);
      expect(result.matchType).toBeNull();
      expect(result.existingId).toBeNull();
    });
  });

  describe("searchCrunchbase", () => {
    it("throws when API key is missing", async () => {
      delete process.env.CRUNCHBASE_API_KEY;

      await expect(searchCrunchbase({ query: "acme", limit: 10 })).rejects.toThrow(
        CrunchbaseImportError,
      );
    });

    it("makes correct API call and returns results", async () => {
      process.env.CRUNCHBASE_API_KEY = "test-key";

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          count: 2,
          entities: [
            {
              identifier: { permalink: "acme-corp", value: "Acme Corp" },
              short_description: "Test company",
            },
            {
              identifier: { permalink: "acme-inc", value: "Acme Inc" },
              short_description: "Another company",
            },
          ],
        }),
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as unknown as Response);

      const result = await searchCrunchbase({ query: "acme", limit: 10 });

      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0]?.crunchbaseId).toBe("acme-corp");
      expect(result.organizations[0]?.name).toBe("Acme Corp");
      expect(result.totalCount).toBe(2);

      vi.restoreAllMocks();
    });

    it("throws on API error", async () => {
      process.env.CRUNCHBASE_API_KEY = "test-key";

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 403,
      } as unknown as Response);

      await expect(searchCrunchbase({ query: "acme", limit: 10 })).rejects.toThrow(
        CrunchbaseImportError,
      );

      vi.restoreAllMocks();
    });
  });

  describe("fetchCrunchbaseOrganization", () => {
    it("fetches and maps organization data", async () => {
      process.env.CRUNCHBASE_API_KEY = "test-key";

      const apiResponse = {
        identifier: { permalink: "acme-corp" },
        properties: {
          name: "Acme Corp",
          short_description: "Building widgets",
          website_url: "https://acme.com",
          image_url: "https://logo.acme.com/img.png",
          categories: [{ value: "Software" }],
          location_identifiers: [{ value: "San Francisco" }],
          founded_on: "2015-06-01",
          num_employees_enum: "c_00051_00100",
          last_funding_type: "series_a",
          funding_total: { value: 10000000, currency: "USD" },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(apiResponse),
      } as unknown as Response);

      const result = await fetchCrunchbaseOrganization("acme-corp");

      expect(result.crunchbaseId).toBe("acme-corp");
      expect(result.name).toBe("Acme Corp");
      expect(result.description).toBe("Building widgets");
      expect(result.websiteUrl).toBe("https://acme.com");
      expect(result.industry).toBe("Software");
      expect(result.location).toBe("San Francisco");
      expect(result.foundedYear).toBe(2015);

      vi.restoreAllMocks();
    });

    it("throws on 404 not found", async () => {
      process.env.CRUNCHBASE_API_KEY = "test-key";

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 404,
      } as unknown as Response);

      await expect(fetchCrunchbaseOrganization("nonexistent")).rejects.toThrow(
        "not found on Crunchbase",
      );

      vi.restoreAllMocks();
    });
  });

  describe("importSingle", () => {
    beforeEach(() => {
      process.env.CRUNCHBASE_API_KEY = "test-key";
    });

    it("skips import when duplicate is found", async () => {
      const apiResponse = {
        identifier: { permalink: "acme-corp" },
        properties: {
          name: "Acme Corp",
          short_description: "Widgets",
          website_url: "https://acme.com",
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(apiResponse),
      } as unknown as Response);

      mockOrg.findUnique.mockResolvedValue({
        id: "existing-id",
        name: "Acme Corp",
      });

      const result = await importSingle(
        { crunchbaseId: "acme-corp", skipDuplicateCheck: false },
        "actor-1",
      );

      expect(result.status).toBe("skipped_duplicate");
      expect(result.organizationId).toBe("existing-id");
      expect(mockOrg.create).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it("creates organization when no duplicate exists", async () => {
      const apiResponse = {
        identifier: { permalink: "new-startup" },
        properties: {
          name: "New Startup",
          short_description: "Fresh venture",
          website_url: "https://newstartup.com",
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(apiResponse),
      } as unknown as Response);

      mockOrg.findUnique.mockResolvedValue(null);
      mockOrg.findMany.mockResolvedValue([]);
      mockOrg.findFirst.mockResolvedValue(null);
      mockOrg.create.mockResolvedValue({
        id: "new-org-id",
        name: "New Startup",
      });

      const result = await importSingle(
        { crunchbaseId: "new-startup", skipDuplicateCheck: false },
        "actor-1",
      );

      expect(result.status).toBe("created");
      expect(result.organizationId).toBe("new-org-id");
      expect(mockOrg.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "New Startup",
            crunchbaseId: "new-startup",
            relationshipStatus: "IDENTIFIED",
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "organization.created",
        expect.objectContaining({
          entity: "organization",
          entityId: "new-org-id",
          metadata: expect.objectContaining({ source: "crunchbase" }),
        }),
      );

      vi.restoreAllMocks();
    });

    it("skips duplicate check when skipDuplicateCheck is true", async () => {
      const apiResponse = {
        identifier: { permalink: "acme-corp" },
        properties: { name: "Acme Corp" },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(apiResponse),
      } as unknown as Response);

      mockOrg.create.mockResolvedValue({
        id: "forced-id",
        name: "Acme Corp",
      });

      const result = await importSingle(
        { crunchbaseId: "acme-corp", skipDuplicateCheck: true },
        "actor-1",
      );

      expect(result.status).toBe("created");
      expect(mockOrg.findUnique).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe("importBatch", () => {
    it("processes multiple organizations and returns summary", async () => {
      process.env.CRUNCHBASE_API_KEY = "test-key";

      let callCount = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          return {
            ok: false,
            status: 404,
          } as unknown as Response;
        }
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({
            identifier: { permalink: `org-${callCount}` },
            properties: { name: `Org ${callCount}` },
          }),
        } as unknown as Response;
      });

      // First org: no duplicate, will be created
      mockOrg.findUnique.mockResolvedValue(null);
      mockOrg.findMany.mockResolvedValue([]);
      mockOrg.findFirst.mockResolvedValue(null);
      mockOrg.create.mockImplementation(async (args: { data: { name: string } }) => ({
        id: `created-${args.data.name}`,
        name: args.data.name,
      }));

      const result = await importBatch(
        {
          crunchbaseIds: ["org-1", "org-not-found", "org-3"],
          skipDuplicateCheck: false,
        },
        "actor-1",
      );

      expect(result.summary.total).toBe(3);
      expect(result.summary.created).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.results[1]?.status).toBe("failed");

      vi.restoreAllMocks();
    });
  });

  describe("schema validation", () => {
    it("validates crunchbaseSearchInput", async () => {
      const { crunchbaseSearchInput } = await import("./crunchbase-import.schemas");

      const valid = crunchbaseSearchInput.parse({ query: "acme", limit: 5 });
      expect(valid.query).toBe("acme");
      expect(valid.limit).toBe(5);

      expect(() => crunchbaseSearchInput.parse({ query: "" })).toThrow();
    });

    it("validates crunchbaseImportBatchInput", async () => {
      const { crunchbaseImportBatchInput } = await import("./crunchbase-import.schemas");

      const valid = crunchbaseImportBatchInput.parse({
        crunchbaseIds: ["a", "b"],
        skipDuplicateCheck: true,
      });
      expect(valid.crunchbaseIds).toHaveLength(2);
      expect(valid.skipDuplicateCheck).toBe(true);

      expect(() => crunchbaseImportBatchInput.parse({ crunchbaseIds: [] })).toThrow();

      const tooMany = Array.from({ length: 51 }, (_, i) => `id-${i}`);
      expect(() => crunchbaseImportBatchInput.parse({ crunchbaseIds: tooMany })).toThrow();
    });
  });
});
