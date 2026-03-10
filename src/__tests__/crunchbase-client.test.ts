import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CrunchbaseClient,
  CrunchbaseApiError,
  CrunchbaseRateLimitError,
} from "../server/lib/crunchbase-client";

function createMockFetch(response: {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const status = response.status ?? 200;
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(response.headers ?? {}),
    json: vi.fn().mockResolvedValue(response.body),
    text: vi.fn().mockResolvedValue(JSON.stringify(response.body)),
  });
}

function createClient(fetchFn: ReturnType<typeof vi.fn>) {
  return new CrunchbaseClient({
    apiKey: "test-api-key",
    baseUrl: "https://api.test.com",
    fetchFn,
  });
}

describe("CrunchbaseClient", () => {
  describe("searchOrganizations", () => {
    it("should search organizations and return mapped results", async () => {
      const mockResponse = {
        count: 2,
        entities: [
          {
            uuid: "uuid-1",
            properties: {
              identifier: { permalink: "openai", value: "OpenAI" },
              short_description: "AI research company",
              image_url: "https://logo.com/openai.png",
              website_url: "https://openai.com",
              category_groups: [{ value: "Artificial Intelligence" }],
              location_identifiers: [
                { value: "San Francisco" },
                { value: "California" },
              ],
              founded_on: "2015-12-11",
              num_employees_enum: "c_00501_01000",
              last_funding_type: "secondary_market",
              funding_total: 11000000000,
            },
          },
          {
            uuid: "uuid-2",
            properties: {
              identifier: { permalink: "anthropic", value: "Anthropic" },
              short_description: "AI safety company",
              website_url: "https://anthropic.com",
              category_groups: [{ value: "Artificial Intelligence" }],
              location_identifiers: [{ value: "San Francisco" }],
              founded_on: "2021-01-01",
              num_employees_enum: "c_00251_00500",
              last_funding_type: "series_c",
              funding_total: 7300000000,
            },
          },
        ],
      };

      const mockFetch = createMockFetch({ body: mockResponse });
      const client = createClient(mockFetch);

      const results = await client.searchOrganizations("AI");

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        uuid: "uuid-1",
        permalink: "openai",
        name: "OpenAI",
        shortDescription: "AI research company",
        logoUrl: "https://logo.com/openai.png",
        websiteUrl: "https://openai.com",
        industry: "Artificial Intelligence",
        location: "San Francisco, California",
        foundedYear: 2015,
        employeeCount: "c_00501_01000",
        fundingStage: "secondary_market",
        fundingTotal: "$11.0B",
      });

      expect(results[1].name).toBe("Anthropic");
      expect(results[1].permalink).toBe("anthropic");
      expect(results[1].fundingTotal).toBe("$7.3B");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.test.com/searches/organizations",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-cb-user-key": "test-api-key",
          }),
        }),
      );
    });

    it("should handle empty search results", async () => {
      const mockFetch = createMockFetch({
        body: { count: 0, entities: [] },
      });
      const client = createClient(mockFetch);

      const results = await client.searchOrganizations("nonexistent");
      expect(results).toHaveLength(0);
    });

    it("should handle entities with minimal properties", async () => {
      const mockFetch = createMockFetch({
        body: {
          count: 1,
          entities: [
            {
              uuid: "uuid-min",
              properties: {
                identifier: { permalink: "minimal-co", value: "Minimal Co" },
              },
            },
          ],
        },
      });
      const client = createClient(mockFetch);

      const results = await client.searchOrganizations("minimal");
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        uuid: "uuid-min",
        permalink: "minimal-co",
        name: "Minimal Co",
        shortDescription: null,
        logoUrl: null,
        websiteUrl: null,
        industry: null,
        location: null,
        foundedYear: null,
        employeeCount: null,
        fundingStage: null,
        fundingTotal: null,
      });
    });
  });

  describe("getOrganization", () => {
    it("should fetch and map full organization details", async () => {
      const mockResponse = {
        properties: {
          uuid: "uuid-detail",
          identifier: { permalink: "test-org", value: "Test Org" },
          short_description: "A test organization",
          website_url: "https://test.org",
          image_url: "https://logo.com/test.png",
          category_groups: [{ value: "Software" }],
          location_identifiers: [{ value: "New York" }],
          founded_on: "2020-06-15",
          num_employees_enum: "c_00101_00250",
          last_funding_type: "series_a",
          funding_total: 25000000,
        },
        cards: {
          founders: [
            {
              identifier: { value: "Jane Doe" },
              title: "CEO",
              linkedin: "https://linkedin.com/in/janedoe",
            },
          ],
          raised_funding_rounds: [
            {
              investment_type: "series_a",
              money_raised: 25000000,
              announced_on: "2023-01-15",
              investor_identifiers: [{ value: "Sequoia Capital" }],
            },
          ],
          press_references: [
            {
              title: "Test Org raises $25M",
              url: "https://news.com/article",
              posted_on: "2023-01-16",
            },
          ],
        },
      };

      const mockFetch = createMockFetch({ body: mockResponse });
      const client = createClient(mockFetch);

      const result = await client.getOrganization("test-org");

      expect(result.name).toBe("Test Org");
      expect(result.permalink).toBe("test-org");
      expect(result.websiteUrl).toBe("https://test.org");
      expect(result.fundingTotal).toBe("$25.0M");
      expect(result.managementTeam).toHaveLength(1);
      expect(result.managementTeam![0].name).toBe("Jane Doe");
      expect(result.fundingRounds).toHaveLength(1);
      expect(result.fundingRounds![0].roundType).toBe("series_a");
      expect(result.newsItems).toHaveLength(1);
      expect(result.newsItems![0].title).toBe("Test Org raises $25M");
    });
  });

  describe("error handling", () => {
    it("should throw CrunchbaseRateLimitError on 429", async () => {
      const mockFetch = createMockFetch({
        status: 429,
        headers: { "Retry-After": "30" },
      });
      const client = createClient(mockFetch);

      await expect(client.searchOrganizations("test")).rejects.toThrow(
        CrunchbaseRateLimitError,
      );
    });

    it("should throw CrunchbaseApiError on non-200 responses", async () => {
      const mockFetch = createMockFetch({
        status: 403,
        body: { message: "Forbidden" },
      });
      const client = createClient(mockFetch);

      await expect(client.searchOrganizations("test")).rejects.toThrow(
        CrunchbaseApiError,
      );
    });

    it("should throw CrunchbaseApiError on 500 responses", async () => {
      const mockFetch = createMockFetch({
        status: 500,
        body: { message: "Internal Server Error" },
      });
      const client = createClient(mockFetch);

      await expect(client.getOrganization("test-org")).rejects.toThrow(
        CrunchbaseApiError,
      );
    });
  });

  describe("funding formatting", () => {
    it("should format billions", async () => {
      const mockFetch = createMockFetch({
        body: {
          count: 1,
          entities: [
            {
              uuid: "uuid-b",
              properties: {
                identifier: { permalink: "big-co", value: "Big Co" },
                funding_total: 2500000000,
              },
            },
          ],
        },
      });
      const client = createClient(mockFetch);
      const results = await client.searchOrganizations("big");
      expect(results[0].fundingTotal).toBe("$2.5B");
    });

    it("should format millions", async () => {
      const mockFetch = createMockFetch({
        body: {
          count: 1,
          entities: [
            {
              uuid: "uuid-m",
              properties: {
                identifier: { permalink: "mid-co", value: "Mid Co" },
                funding_total: 15000000,
              },
            },
          ],
        },
      });
      const client = createClient(mockFetch);
      const results = await client.searchOrganizations("mid");
      expect(results[0].fundingTotal).toBe("$15.0M");
    });

    it("should format thousands", async () => {
      const mockFetch = createMockFetch({
        body: {
          count: 1,
          entities: [
            {
              uuid: "uuid-k",
              properties: {
                identifier: { permalink: "small-co", value: "Small Co" },
                funding_total: 500000,
              },
            },
          ],
        },
      });
      const client = createClient(mockFetch);
      const results = await client.searchOrganizations("small");
      expect(results[0].fundingTotal).toBe("$500K");
    });

    it("should handle funding as object with value", async () => {
      const mockFetch = createMockFetch({
        body: {
          count: 1,
          entities: [
            {
              uuid: "uuid-obj",
              properties: {
                identifier: { permalink: "obj-co", value: "Obj Co" },
                funding_total: { value: 10000000, currency: "USD" },
              },
            },
          ],
        },
      });
      const client = createClient(mockFetch);
      const results = await client.searchOrganizations("obj");
      expect(results[0].fundingTotal).toBe("$10.0M");
    });
  });

  describe("location extraction", () => {
    it("should join multiple location identifiers", async () => {
      const mockFetch = createMockFetch({
        body: {
          count: 1,
          entities: [
            {
              uuid: "uuid-loc",
              properties: {
                identifier: { permalink: "loc-co", value: "Loc Co" },
                location_identifiers: [
                  { value: "Austin" },
                  { value: "Texas" },
                  { value: "United States" },
                ],
              },
            },
          ],
        },
      });
      const client = createClient(mockFetch);
      const results = await client.searchOrganizations("loc");
      expect(results[0].location).toBe("Austin, Texas, United States");
    });
  });
});
