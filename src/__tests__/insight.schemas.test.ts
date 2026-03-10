/**
 * Tests for Insight Zod Schemas — Story 9.4 (FR79)
 *
 * Validates input validation schemas for the tRPC insights router.
 */

import { describe, it, expect } from "vitest";
import {
  createInsightSchema,
  updateInsightSchema,
  listInsightsSchema,
  getInsightByIdSchema,
  approveInsightSchema,
  linkToTrendSchema,
} from "../server/trpc/routers/strategy.insights";

describe("Insight Schemas", () => {
  // ─── createInsightSchema ──────────────────────────────────────────────

  describe("createInsightSchema", () => {
    it("accepts valid input with required fields", () => {
      const result = createInsightSchema.safeParse({
        title: "AI is transforming healthcare",
        content: "We observed a 40% increase in AI adoption in hospitals…",
        insightType: "SIGNAL",
      });

      expect(result.success).toBe(true);
    });

    it("accepts valid input with all optional fields", () => {
      const result = createInsightSchema.safeParse({
        title: "Market Opportunity",
        content: "There's a gap in the market for…",
        insightType: "OPPORTUNITY",
        scope: "CAMPAIGN",
        scopeEntityId: "clxyz123456789abcdef01234",
        sourceUrl: "https://example.com/report",
        imageUrl: "https://example.com/image.png",
        trendIds: ["clxyz123456789abcdef01234"],
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createInsightSchema.safeParse({
        title: "",
        content: "Some content",
        insightType: "SIGNAL",
      });

      expect(result.success).toBe(false);
    });

    it("rejects title exceeding 200 characters", () => {
      const result = createInsightSchema.safeParse({
        title: "A".repeat(201),
        content: "Some content",
        insightType: "SIGNAL",
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty content", () => {
      const result = createInsightSchema.safeParse({
        title: "Valid title",
        content: "",
        insightType: "SIGNAL",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid insightType", () => {
      const result = createInsightSchema.safeParse({
        title: "Valid title",
        content: "Some content",
        insightType: "INVALID_TYPE",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid scope", () => {
      const result = createInsightSchema.safeParse({
        title: "Valid title",
        content: "Some content",
        insightType: "SIGNAL",
        scope: "INVALID_SCOPE",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid sourceUrl", () => {
      const result = createInsightSchema.safeParse({
        title: "Valid title",
        content: "Some content",
        insightType: "SIGNAL",
        sourceUrl: "not-a-url",
      });

      expect(result.success).toBe(false);
    });

    it("limits trendIds to max 10", () => {
      const result = createInsightSchema.safeParse({
        title: "Valid title",
        content: "Some content",
        insightType: "SIGNAL",
        trendIds: Array.from({ length: 11 }, () => "clxyz123456789abcdef01234"),
      });

      expect(result.success).toBe(false);
    });

    it("defaults scope to GLOBAL", () => {
      const result = createInsightSchema.safeParse({
        title: "Valid title",
        content: "Some content",
        insightType: "SIGNAL",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe("GLOBAL");
      }
    });
  });

  // ─── updateInsightSchema ──────────────────────────────────────────────

  describe("updateInsightSchema", () => {
    it("accepts partial update data", () => {
      const result = updateInsightSchema.safeParse({
        id: "clxyz123456789abcdef01234",
        data: { title: "Updated title" },
      });

      expect(result.success).toBe(true);
    });

    it("requires valid CUID for id", () => {
      const result = updateInsightSchema.safeParse({
        id: "invalid-id",
        data: { title: "Updated title" },
      });

      expect(result.success).toBe(false);
    });

    it("allows nullable sourceUrl to clear the field", () => {
      const result = updateInsightSchema.safeParse({
        id: "clxyz123456789abcdef01234",
        data: { sourceUrl: null },
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── listInsightsSchema ───────────────────────────────────────────────

  describe("listInsightsSchema", () => {
    it("accepts empty filter object", () => {
      const result = listInsightsSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it("defaults limit to 20", () => {
      const result = listInsightsSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("rejects limit > 100", () => {
      const result = listInsightsSchema.safeParse({ limit: 101 });

      expect(result.success).toBe(false);
    });

    it("rejects search string > 200 characters", () => {
      const result = listInsightsSchema.safeParse({
        search: "A".repeat(201),
      });

      expect(result.success).toBe(false);
    });

    it("accepts all filter combinations", () => {
      const result = listInsightsSchema.safeParse({
        campaignId: "clxyz123456789abcdef01234",
        trendId: "clxyz123456789abcdef01234",
        insightType: "RISK",
        scope: "TREND",
        visibility: "PENDING_APPROVAL",
        search: "innovation",
        cursor: "clxyz123456789abcdef01234",
        limit: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── getInsightByIdSchema ─────────────────────────────────────────────

  describe("getInsightByIdSchema", () => {
    it("accepts valid CUID", () => {
      const result = getInsightByIdSchema.safeParse({
        id: "clxyz123456789abcdef01234",
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid CUID", () => {
      const result = getInsightByIdSchema.safeParse({
        id: "not-a-cuid",
      });

      expect(result.success).toBe(false);
    });
  });

  // ─── approveInsightSchema ─────────────────────────────────────────────

  describe("approveInsightSchema", () => {
    it("accepts valid CUID", () => {
      const result = approveInsightSchema.safeParse({
        id: "clxyz123456789abcdef01234",
      });

      expect(result.success).toBe(true);
    });
  });

  // ─── linkToTrendSchema ────────────────────────────────────────────────

  describe("linkToTrendSchema", () => {
    it("accepts valid CUIDs for both insightId and trendId", () => {
      const result = linkToTrendSchema.safeParse({
        insightId: "clxyz123456789abcdef01234",
        trendId: "clxyz123456789abcdef01234",
      });

      expect(result.success).toBe(true);
    });

    it("rejects missing insightId", () => {
      const result = linkToTrendSchema.safeParse({
        trendId: "clxyz123456789abcdef01234",
      });

      expect(result.success).toBe(false);
    });
  });
});
