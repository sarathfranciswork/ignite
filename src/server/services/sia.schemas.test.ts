import { describe, it, expect } from "vitest";
import {
  siaCreateInput,
  siaUpdateInput,
  siaListInput,
  siaGetByIdInput,
  siaDeleteInput,
  siaLinkCampaignInput,
} from "./sia.schemas";

describe("sia.schemas", () => {
  describe("siaCreateInput", () => {
    it("accepts valid input", () => {
      const result = siaCreateInput.safeParse({
        name: "Sustainable Energy",
        description: "Focus on clean energy solutions",
      });
      expect(result.success).toBe(true);
    });

    it("accepts input with imageUrl", () => {
      const result = siaCreateInput.safeParse({
        name: "AI & Machine Learning",
        imageUrl: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = siaCreateInput.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding max length", () => {
      const result = siaCreateInput.safeParse({ name: "x".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("rejects invalid imageUrl", () => {
      const result = siaCreateInput.safeParse({
        name: "Test",
        imageUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("siaUpdateInput", () => {
    it("accepts partial updates", () => {
      const result = siaUpdateInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxx",
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("accepts isActive toggle", () => {
      const result = siaUpdateInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxx",
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it("requires valid cuid for id", () => {
      const result = siaUpdateInput.safeParse({
        id: "not-a-cuid",
        name: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("allows nullable description", () => {
      const result = siaUpdateInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxx",
        description: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("siaListInput", () => {
    it("uses defaults for empty input", () => {
      const result = siaListInput.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("accepts all filter params", () => {
      const result = siaListInput.safeParse({
        search: "energy",
        isActive: true,
        limit: 10,
      });
      expect(result.success).toBe(true);
    });

    it("rejects limit over 100", () => {
      const result = siaListInput.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe("siaGetByIdInput / siaDeleteInput", () => {
    it("requires a valid cuid", () => {
      expect(siaGetByIdInput.safeParse({}).success).toBe(false);
      expect(siaGetByIdInput.safeParse({ id: "invalid" }).success).toBe(false);
      expect(siaGetByIdInput.safeParse({ id: "clxxxxxxxxxxxxxxxxxxxxxxx" }).success).toBe(true);
    });

    it("siaDeleteInput requires a valid cuid", () => {
      expect(siaDeleteInput.safeParse({ id: "clxxxxxxxxxxxxxxxxxxxxxxx" }).success).toBe(true);
      expect(siaDeleteInput.safeParse({ id: "invalid" }).success).toBe(false);
    });
  });

  describe("siaLinkCampaignInput", () => {
    it("accepts valid siaId and campaignId", () => {
      const result = siaLinkCampaignInput.safeParse({
        siaId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        campaignId: "clyyyyyyyyyyyyyyyyyyyyyyy",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid IDs", () => {
      const result = siaLinkCampaignInput.safeParse({
        siaId: "invalid",
        campaignId: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });
});
