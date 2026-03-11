import { describe, it, expect } from "vitest";
import { ideaBoardListInput } from "./idea.schemas";

describe("ideaBoardListInput schema", () => {
  it("validates valid input with defaults", () => {
    const result = ideaBoardListInput.safeParse({
      campaignId: "campaign-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.sortField).toBe("createdAt");
      expect(result.data.sortDirection).toBe("desc");
    }
  });

  it("validates input with all fields", () => {
    const result = ideaBoardListInput.safeParse({
      campaignId: "campaign-1",
      cursor: "cursor-id",
      limit: 50,
      search: "machine learning",
      status: "HOT",
      tag: "ai",
      category: "Technology",
      sortField: "likesCount",
      sortDirection: "asc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortField).toBe("likesCount");
      expect(result.data.sortDirection).toBe("asc");
      expect(result.data.status).toBe("HOT");
    }
  });

  it("rejects invalid sort field", () => {
    const result = ideaBoardListInput.safeParse({
      campaignId: "campaign-1",
      sortField: "invalidField",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sort direction", () => {
    const result = ideaBoardListInput.safeParse({
      campaignId: "campaign-1",
      sortDirection: "sideways",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = ideaBoardListInput.safeParse({
      campaignId: "campaign-1",
      status: "INVALID_STATUS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects limit over 100", () => {
    const result = ideaBoardListInput.safeParse({
      campaignId: "campaign-1",
      limit: 101,
    });
    expect(result.success).toBe(false);
  });

  it("requires campaignId", () => {
    const result = ideaBoardListInput.safeParse({});
    expect(result.success).toBe(false);
  });
});
