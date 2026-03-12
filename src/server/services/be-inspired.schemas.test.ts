import { describe, it, expect } from "vitest";
import {
  beInspiredInput,
  campaignSiaLinkInput,
  campaignSiaUnlinkInput,
} from "./be-inspired.schemas";

describe("beInspiredInput", () => {
  it("accepts valid campaignId", () => {
    const result = beInspiredInput.safeParse({ campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx" });
    expect(result.success).toBe(true);
  });

  it("rejects missing campaignId", () => {
    const result = beInspiredInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid cuid", () => {
    const result = beInspiredInput.safeParse({ campaignId: "not-a-cuid" });
    expect(result.success).toBe(false);
  });
});

describe("campaignSiaLinkInput", () => {
  it("accepts valid input", () => {
    const result = campaignSiaLinkInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      siaIds: ["clyyyyyyyyyyyyyyyyyyyyyyyyy"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty siaIds", () => {
    const result = campaignSiaLinkInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      siaIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 siaIds", () => {
    const siaIds = Array.from({ length: 21 }, (_, i) => `cl${String(i).padStart(24, "x")}`);
    const result = campaignSiaLinkInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      siaIds,
    });
    expect(result.success).toBe(false);
  });
});

describe("campaignSiaUnlinkInput", () => {
  it("accepts valid input", () => {
    const result = campaignSiaUnlinkInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      siaId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing siaId", () => {
    const result = campaignSiaUnlinkInput.safeParse({
      campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(result.success).toBe(false);
  });
});
