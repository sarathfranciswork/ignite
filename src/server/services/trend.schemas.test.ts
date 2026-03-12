import { describe, it, expect } from "vitest";
import {
  trendListInput,
  trendCreateInput,
  trendUpdateInput,
  trendGetByIdInput,
  trendDeleteInput,
  trendArchiveInput,
  trendLinkSiaInput,
  trendUnlinkSiaInput,
} from "./trend.schemas";

describe("trendListInput", () => {
  it("accepts valid input with defaults", () => {
    const result = trendListInput.parse({});
    expect(result.limit).toBe(20);
    expect(result.sortBy).toBe("title");
    expect(result.sortDirection).toBe("asc");
  });

  it("accepts search and filters", () => {
    const result = trendListInput.parse({
      search: "ai",
      type: "MEGA",
      isArchived: false,
      limit: 10,
    });
    expect(result.search).toBe("ai");
    expect(result.type).toBe("MEGA");
    expect(result.isArchived).toBe(false);
    expect(result.limit).toBe(10);
  });

  it("accepts siaId filter", () => {
    const result = trendListInput.parse({
      siaId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(result.siaId).toBe("clxxxxxxxxxxxxxxxxxxxxxxxxx");
  });

  it("rejects limit over 100", () => {
    expect(() => trendListInput.parse({ limit: 101 })).toThrow();
  });

  it("rejects invalid type", () => {
    expect(() => trendListInput.parse({ type: "INVALID" })).toThrow();
  });
});

describe("trendCreateInput", () => {
  it("accepts valid input with title only", () => {
    const result = trendCreateInput.parse({ title: "Test Trend" });
    expect(result.title).toBe("Test Trend");
    expect(result.type).toBe("MICRO");
    expect(result.isConfidential).toBe(false);
    expect(result.isCommunitySubmitted).toBe(false);
  });

  it("accepts all fields", () => {
    const result = trendCreateInput.parse({
      title: "Generative AI",
      description: "AI that generates content",
      type: "MACRO",
      sourceUrl: "https://example.com",
      isConfidential: true,
      businessRelevance: 8.5,
      parentId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
    });
    expect(result.type).toBe("MACRO");
    expect(result.isConfidential).toBe(true);
    expect(result.businessRelevance).toBe(8.5);
  });

  it("rejects empty title", () => {
    expect(() => trendCreateInput.parse({ title: "" })).toThrow();
  });

  it("rejects invalid sourceUrl", () => {
    expect(() => trendCreateInput.parse({ title: "Test", sourceUrl: "not-a-url" })).toThrow();
  });

  it("rejects businessRelevance out of range", () => {
    expect(() => trendCreateInput.parse({ title: "Test", businessRelevance: 11 })).toThrow();
    expect(() => trendCreateInput.parse({ title: "Test", businessRelevance: -1 })).toThrow();
  });
});

describe("trendUpdateInput", () => {
  it("requires id", () => {
    expect(() => trendUpdateInput.parse({})).toThrow();
  });

  it("accepts partial updates", () => {
    const result = trendUpdateInput.parse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      title: "Updated",
    });
    expect(result.title).toBe("Updated");
  });

  it("allows nullable fields", () => {
    const result = trendUpdateInput.parse({
      id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
      description: null,
      imageUrl: null,
      sourceUrl: null,
      trendOneId: null,
      businessRelevance: null,
      parentId: null,
    });
    expect(result.description).toBeNull();
    expect(result.parentId).toBeNull();
  });
});

describe("trendGetByIdInput / trendDeleteInput / trendArchiveInput", () => {
  it("requires a valid cuid", () => {
    expect(() => trendGetByIdInput.parse({})).toThrow();
    expect(() => trendGetByIdInput.parse({ id: "invalid" })).toThrow();
    expect(() => trendGetByIdInput.parse({ id: "clxxxxxxxxxxxxxxxxxxxxxxxxx" })).not.toThrow();
  });

  it("trendDeleteInput requires a valid cuid", () => {
    expect(() => trendDeleteInput.parse({ id: "clxxxxxxxxxxxxxxxxxxxxxxxxx" })).not.toThrow();
  });

  it("trendArchiveInput requires a valid cuid", () => {
    expect(() => trendArchiveInput.parse({ id: "clxxxxxxxxxxxxxxxxxxxxxxxxx" })).not.toThrow();
  });
});

describe("trendLinkSiaInput", () => {
  it("requires both trendId and siaId", () => {
    expect(() => trendLinkSiaInput.parse({})).toThrow();
    expect(() =>
      trendLinkSiaInput.parse({
        trendId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        siaId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
      }),
    ).not.toThrow();
  });
});

describe("trendUnlinkSiaInput", () => {
  it("requires both trendId and siaId", () => {
    expect(() => trendUnlinkSiaInput.parse({})).toThrow();
    expect(() =>
      trendUnlinkSiaInput.parse({
        trendId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        siaId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
      }),
    ).not.toThrow();
  });
});
