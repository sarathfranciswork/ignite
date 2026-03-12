import { describe, it, expect } from "vitest";
import { ideaLineageInput, dashboardStatsInput, pipelineStatsInput } from "./project.schemas";

describe("traceability schemas", () => {
  describe("ideaLineageInput", () => {
    it("should accept valid CUID ideaId", () => {
      const result = ideaLineageInput.safeParse({ ideaId: "clx1234567890abcdefghij" });
      expect(result.success).toBe(true);
    });

    it("should reject missing ideaId", () => {
      const result = ideaLineageInput.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-CUID ideaId", () => {
      const result = ideaLineageInput.safeParse({ ideaId: "not-a-cuid" });
      expect(result.success).toBe(false);
    });
  });

  describe("dashboardStatsInput", () => {
    it("should accept empty filter object", () => {
      const result = dashboardStatsInput.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept valid status filter", () => {
      const result = dashboardStatsInput.safeParse({ status: "ACTIVE" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = dashboardStatsInput.safeParse({ status: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("should accept processDefinitionId filter", () => {
      const result = dashboardStatsInput.safeParse({
        processDefinitionId: "clx1234567890abcdefghij",
      });
      expect(result.success).toBe(true);
    });

    it("should accept date range filters", () => {
      const result = dashboardStatsInput.safeParse({
        dateFrom: "2026-01-01T00:00:00.000Z",
        dateTo: "2026-12-31T23:59:59.999Z",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("pipelineStatsInput", () => {
    it("should accept empty object", () => {
      const result = pipelineStatsInput.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept date range", () => {
      const result = pipelineStatsInput.safeParse({
        dateFrom: "2026-01-01T00:00:00.000Z",
        dateTo: "2026-06-30T23:59:59.999Z",
      });
      expect(result.success).toBe(true);
    });
  });
});
