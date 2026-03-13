import { describe, it, expect, vi, beforeEach } from "vitest";
import { JiraAdapter } from "./jira.adapter";

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

describe("JiraAdapter", () => {
  const adapter = new JiraAdapter("https://jira.example.com", "test-token", "PROJ");

  describe("createIssue", () => {
    it("creates a Jira issue successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "10001",
          key: "PROJ-123",
          self: "https://jira.example.com/rest/api/3/issue/10001",
        }),
      });

      const result = await adapter.createIssue({
        title: "Test Issue",
        description: "Test Description",
        fields: {},
      });

      expect(result.externalId).toBe("PROJ-123");
      expect(result.externalUrl).toBe("https://jira.example.com/browse/PROJ-123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://jira.example.com/rest/api/3/issue",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      await expect(
        adapter.createIssue({ title: "Test", description: "", fields: {} }),
      ).rejects.toThrow("Jira API error: 400");
    });
  });

  describe("updateStatus", () => {
    it("transitions a Jira issue", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            transitions: [
              { id: "31", name: "In Progress" },
              { id: "41", name: "Done" },
            ],
          }),
        })
        .mockResolvedValueOnce({ ok: true });

      await adapter.updateStatus({ externalId: "PROJ-123", status: "Done" });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws when transition not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transitions: [{ id: "31", name: "In Progress" }] }),
      });

      await expect(
        adapter.updateStatus({ externalId: "PROJ-123", status: "NonExistent" }),
      ).rejects.toThrow("No transition found");
    });
  });

  describe("getIssue", () => {
    it("fetches a Jira issue", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          key: "PROJ-123",
          fields: { status: { name: "In Progress" } },
        }),
      });

      const result = await adapter.getIssue("PROJ-123");

      expect(result.externalId).toBe("PROJ-123");
      expect(result.status).toBe("In Progress");
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
      expect(result.message).toContain("401");
    });

    it("returns failure on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain("Network error");
    });
  });
});
