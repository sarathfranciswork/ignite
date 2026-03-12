import { describe, it, expect } from "vitest";
import {
  bucketCreateInput,
  bucketUpdateInput,
  bucketListInput,
  bucketAssignIdeaInput,
  bucketReorderInput,
} from "./bucket.schemas";

describe("bucket.schemas", () => {
  describe("bucketCreateInput", () => {
    it("accepts valid manual bucket input", () => {
      const result = bucketCreateInput.safeParse({
        campaignId: "campaign_1",
        name: "Top Ideas",
        color: "#6366F1",
        type: "MANUAL",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid smart bucket input with filter criteria", () => {
      const result = bucketCreateInput.safeParse({
        campaignId: "campaign_1",
        name: "Hot Ideas",
        color: "#EF4444",
        type: "SMART",
        filterCriteria: {
          status: "HOT",
          minLikes: 5,
          minComments: 2,
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = bucketCreateInput.safeParse({
        campaignId: "campaign_1",
        name: "",
        color: "#6366F1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid color hex", () => {
      const result = bucketCreateInput.safeParse({
        campaignId: "campaign_1",
        name: "Test",
        color: "red",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 100 characters", () => {
      const result = bucketCreateInput.safeParse({
        campaignId: "campaign_1",
        name: "a".repeat(101),
        color: "#6366F1",
      });
      expect(result.success).toBe(false);
    });

    it("accepts input without optional fields", () => {
      const result = bucketCreateInput.safeParse({
        campaignId: "campaign_1",
        name: "Test",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBe("#6366F1");
        expect(result.data.type).toBe("MANUAL");
      }
    });
  });

  describe("bucketUpdateInput", () => {
    it("accepts partial update", () => {
      const result = bucketUpdateInput.safeParse({
        id: "bucket_1",
        name: "Renamed",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null description to clear it", () => {
      const result = bucketUpdateInput.safeParse({
        id: "bucket_1",
        description: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("bucketListInput", () => {
    it("accepts minimal input", () => {
      const result = bucketListInput.safeParse({
        campaignId: "campaign_1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("accepts type filter", () => {
      const result = bucketListInput.safeParse({
        campaignId: "campaign_1",
        type: "SMART",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid type", () => {
      const result = bucketListInput.safeParse({
        campaignId: "campaign_1",
        type: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bucketAssignIdeaInput", () => {
    it("accepts valid input", () => {
      const result = bucketAssignIdeaInput.safeParse({
        bucketId: "bucket_1",
        ideaId: "idea_1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing bucketId", () => {
      const result = bucketAssignIdeaInput.safeParse({
        ideaId: "idea_1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bucketReorderInput", () => {
    it("accepts valid reorder input", () => {
      const result = bucketReorderInput.safeParse({
        campaignId: "campaign_1",
        bucketIds: ["b1", "b2", "b3"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty bucketIds array", () => {
      const result = bucketReorderInput.safeParse({
        campaignId: "campaign_1",
        bucketIds: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
