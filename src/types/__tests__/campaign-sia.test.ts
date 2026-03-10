import { describe, it, expect } from "vitest";
import {
  linkCampaignToSiasSchema,
  unlinkCampaignSiaSchema,
  getBeInspiredSchema,
  linkIdeaToTrendSchema,
} from "../campaign-sia";

describe("Campaign-SIA Zod Schemas", () => {
  describe("linkCampaignToSiasSchema", () => {
    it("validates correct input", () => {
      const input = {
        campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        siaIds: ["clyyyyyyyyyyyyyyyyyyyyyyyyy"],
      };
      // cuid() validation expects a specific format
      const result = linkCampaignToSiasSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects empty siaIds array", () => {
      const input = {
        campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        siaIds: [],
      };
      const result = linkCampaignToSiasSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing campaignId", () => {
      const input = {
        siaIds: ["clyyyyyyyyyyyyyyyyyyyyyyyyy"],
      };
      const result = linkCampaignToSiasSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("unlinkCampaignSiaSchema", () => {
    it("validates correct input", () => {
      const input = {
        campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        siaId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
      };
      const result = unlinkCampaignSiaSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects missing siaId", () => {
      const input = {
        campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      };
      const result = unlinkCampaignSiaSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("getBeInspiredSchema", () => {
    it("validates correct input", () => {
      const input = { campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx" };
      const result = getBeInspiredSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects non-cuid campaignId", () => {
      const input = { campaignId: "not-a-cuid" };
      const result = getBeInspiredSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("linkIdeaToTrendSchema", () => {
    it("validates correct input", () => {
      const input = {
        ideaId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        trendId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
      };
      const result = linkIdeaToTrendSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects empty strings", () => {
      const input = { ideaId: "", trendId: "" };
      const result = linkIdeaToTrendSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
