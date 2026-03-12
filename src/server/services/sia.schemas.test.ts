import { describe, it, expect } from "vitest";
import {
  siaListInput,
  siaCreateInput,
  siaUpdateInput,
  siaGetByIdInput,
  siaDeleteInput,
  siaLinkCampaignInput,
  siaUnlinkCampaignInput,
} from "./sia.schemas";

describe("siaListInput", () => {
  it("accepts valid input with defaults", () => {
    const result = siaListInput.parse({});
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("name");
    expect(result.sortDirection).toBe("asc");
  });

  it("accepts search and filter", () => {
    const result = siaListInput.parse({
      search: "digital",
      isActive: true,
      limit: 10,
    });
    expect(result.search).toBe("digital");
    expect(result.isActive).toBe(true);
    expect(result.limit).toBe(10);
  });

  it("rejects limit over 100", () => {
    expect(() => siaListInput.parse({ limit: 101 })).toThrow();
  });
});

describe("siaCreateInput", () => {
  it("accepts valid input with name only", () => {
    const result = siaCreateInput.parse({ name: "Test SIA" });
    expect(result.name).toBe("Test SIA");
    expect(result.isActive).toBe(true);
  });

  it("accepts all fields", () => {
    const result = siaCreateInput.parse({
      name: "Test SIA",
      description: "A test description",
      color: "#FF5733",
      bannerUrl: "https://example.com/banner.jpg",
      isActive: false,
    });
    expect(result.color).toBe("#FF5733");
    expect(result.isActive).toBe(false);
  });

  it("rejects empty name", () => {
    expect(() => siaCreateInput.parse({ name: "" })).toThrow();
  });

  it("rejects invalid color format", () => {
    expect(() => siaCreateInput.parse({ name: "Test", color: "red" })).toThrow();
    expect(() => siaCreateInput.parse({ name: "Test", color: "#GGG" })).toThrow();
  });

  it("rejects invalid banner URL", () => {
    expect(() => siaCreateInput.parse({ name: "Test", bannerUrl: "not-a-url" })).toThrow();
  });
});

describe("siaUpdateInput", () => {
  it("requires id", () => {
    expect(() => siaUpdateInput.parse({})).toThrow();
  });

  it("accepts partial updates", () => {
    const result = siaUpdateInput.parse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      name: "Updated",
    });
    expect(result.name).toBe("Updated");
  });

  it("allows nullable fields", () => {
    const result = siaUpdateInput.parse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      description: null,
      color: null,
      bannerUrl: null,
    });
    expect(result.description).toBeNull();
    expect(result.color).toBeNull();
  });
});

describe("siaGetByIdInput / siaDeleteInput", () => {
  it("requires a valid cuid", () => {
    expect(() => siaGetByIdInput.parse({})).toThrow();
    expect(() => siaGetByIdInput.parse({ id: "invalid" })).toThrow();
    expect(() => siaGetByIdInput.parse({ id: "clxxxxxxxxxxxxxxxxxxxxxxxxx" })).not.toThrow();
  });

  it("siaDeleteInput requires a valid cuid", () => {
    expect(() => siaDeleteInput.parse({ id: "clxxxxxxxxxxxxxxxxxxxxxxxxx" })).not.toThrow();
  });
});

describe("siaLinkCampaignInput", () => {
  it("requires both siaId and campaignId", () => {
    expect(() => siaLinkCampaignInput.parse({})).toThrow();
    expect(() =>
      siaLinkCampaignInput.parse({
        siaId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        campaignId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
      }),
    ).not.toThrow();
  });
});

describe("siaUnlinkCampaignInput", () => {
  it("requires campaignId", () => {
    expect(() => siaUnlinkCampaignInput.parse({})).toThrow();
    expect(() =>
      siaUnlinkCampaignInput.parse({
        campaignId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      }),
    ).not.toThrow();
  });
});
