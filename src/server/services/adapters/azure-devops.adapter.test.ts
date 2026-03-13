import { describe, it, expect, vi, beforeEach } from "vitest";
import { AzureDevOpsAdapter } from "./azure-devops.adapter";

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

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AzureDevOpsAdapter", () => {
  const adapter = new AzureDevOpsAdapter("https://dev.azure.com/myorg", "test-pat", "MyProject");

  describe("createIssue", () => {
    it("creates an ADO work item successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 42,
          fields: { "System.State": "New", "System.Title": "Test Task" },
          _links: { html: { href: "https://dev.azure.com/myorg/MyProject/_workitems/edit/42" } },
        }),
      });

      const result = await adapter.createIssue({
        title: "Test Task",
        description: "Test Description",
        fields: {},
      });

      expect(result.externalId).toBe("42");
      expect(result.externalUrl).toContain("_workitems/edit/42");
      expect(result.status).toBe("New");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(
        adapter.createIssue({ title: "Test", description: "", fields: {} }),
      ).rejects.toThrow("Azure DevOps API error: 400");
    });
  });

  describe("updateStatus", () => {
    it("updates ADO work item state", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await adapter.updateStatus({ externalId: "42", status: "Active" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("workitems/42"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("throws on update failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(adapter.updateStatus({ externalId: "999", status: "Active" })).rejects.toThrow(
        "ADO status update failed",
      );
    });
  });

  describe("getIssue", () => {
    it("fetches an ADO work item", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 42,
          fields: { "System.State": "Active", "System.Title": "Test" },
          _links: { html: { href: "https://dev.azure.com/myorg/MyProject/_workitems/edit/42" } },
        }),
      });

      const result = await adapter.getIssue("42");

      expect(result.externalId).toBe("42");
      expect(result.status).toBe("Active");
    });
  });

  describe("testConnection", () => {
    it("returns success on valid connection", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
    });

    it("returns failure on auth error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
    });

    it("returns failure on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("ECONNREFUSED");
    });
  });
});
