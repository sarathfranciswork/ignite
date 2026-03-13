import { describe, it, expect } from "vitest";
import { clipCreateInput, clipListInput } from "./clip.schemas";

describe("clipCreateInput", () => {
  it("accepts valid trend clip", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com/article",
      title: "Test Article",
      excerpt: "Some text",
      type: "trend",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid insight clip", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com/signal",
      title: "Market Signal",
      type: "insight",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid idea clip with campaignId", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com/idea",
      title: "New Idea",
      type: "idea",
      campaignId: "clh1234567890abcdefghij",
      tags: ["tech"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = clipCreateInput.safeParse({
      url: "not-a-url",
      title: "Test",
      type: "trend",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com",
      title: "",
      type: "trend",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com",
      title: "a".repeat(201),
      type: "trend",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com",
      title: "Test",
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional fields to be omitted", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com",
      title: "Test",
      type: "trend",
    });
    expect(result.success).toBe(true);
  });

  it("rejects excerpt over 10000 characters", () => {
    const result = clipCreateInput.safeParse({
      url: "https://example.com",
      title: "Test",
      type: "trend",
      excerpt: "a".repeat(10001),
    });
    expect(result.success).toBe(false);
  });
});

describe("clipListInput", () => {
  it("accepts empty input with defaults", () => {
    const result = clipListInput.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("accepts custom limit", () => {
    const result = clipListInput.safeParse({ limit: 50 });
    expect(result.success).toBe(true);
  });

  it("rejects limit over 100", () => {
    const result = clipListInput.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects limit under 1", () => {
    const result = clipListInput.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });
});
