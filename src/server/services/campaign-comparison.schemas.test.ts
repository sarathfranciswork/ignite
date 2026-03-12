import { describe, it, expect } from "vitest";
import { campaignComparisonInput, successFactorInput } from "./campaign-comparison.schemas";

describe("campaignComparisonInput", () => {
  it("accepts 2 campaign IDs", () => {
    const result = campaignComparisonInput.safeParse({
      campaignIds: ["clsomevalidid1aa", "clsomevalidid2bb"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts 4 campaign IDs", () => {
    const result = campaignComparisonInput.safeParse({
      campaignIds: ["clsomevalidid1aa", "clsomevalidid2bb", "clsomevalidid3cc", "clsomevalidid4dd"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 campaign IDs", () => {
    const result = campaignComparisonInput.safeParse({
      campaignIds: ["clsomevalidid1aa"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 4 campaign IDs", () => {
    const result = campaignComparisonInput.safeParse({
      campaignIds: [
        "clsomevalidid1aa",
        "clsomevalidid2bb",
        "clsomevalidid3cc",
        "clsomevalidid4dd",
        "clsomevalidid5ee",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty array", () => {
    const result = campaignComparisonInput.safeParse({ campaignIds: [] });
    expect(result.success).toBe(false);
  });
});

describe("successFactorInput", () => {
  it("accepts empty object", () => {
    const result = successFactorInput.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts date range with from", () => {
    const result = successFactorInput.safeParse({
      dateRange: { from: "2026-01-01T00:00:00.000Z" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts date range with both from and to", () => {
    const result = successFactorInput.safeParse({
      dateRange: {
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-06-01T00:00:00.000Z",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = successFactorInput.safeParse({
      dateRange: { from: "not-a-date" },
    });
    expect(result.success).toBe(false);
  });
});
