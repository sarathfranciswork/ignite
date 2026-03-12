import { describe, it, expect } from "vitest";
import {
  ideaSplitInput,
  ideaMergeInput,
  ideaBulkAssignBucketInput,
  ideaBulkArchiveInput,
  ideaBulkExportInput,
} from "./idea.schemas";

describe("ideaSplitInput", () => {
  it("should accept valid split input with 2 new ideas", () => {
    const result = ideaSplitInput.safeParse({
      id: "idea-1",
      newIdeas: [
        { title: "Part 1", description: "Desc 1" },
        { title: "Part 2", description: "Desc 2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject split with fewer than 2 new ideas", () => {
    const result = ideaSplitInput.safeParse({
      id: "idea-1",
      newIdeas: [{ title: "Only one" }],
    });
    expect(result.success).toBe(false);
  });

  it("should reject split with more than 10 new ideas", () => {
    const result = ideaSplitInput.safeParse({
      id: "idea-1",
      newIdeas: Array.from({ length: 11 }, (_, i) => ({ title: `Part ${i + 1}` })),
    });
    expect(result.success).toBe(false);
  });

  it("should reject new idea with empty title", () => {
    const result = ideaSplitInput.safeParse({
      id: "idea-1",
      newIdeas: [{ title: "", description: "Desc 1" }, { title: "Part 2" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("ideaMergeInput", () => {
  it("should accept valid merge input", () => {
    const result = ideaMergeInput.safeParse({
      targetIdeaId: "target-1",
      sourceIdeaIds: ["src-1", "src-2"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject merge with no source ideas", () => {
    const result = ideaMergeInput.safeParse({
      targetIdeaId: "target-1",
      sourceIdeaIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("should reject merge with more than 20 source ideas", () => {
    const result = ideaMergeInput.safeParse({
      targetIdeaId: "target-1",
      sourceIdeaIds: Array.from({ length: 21 }, (_, i) => `src-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("ideaBulkAssignBucketInput", () => {
  it("should accept valid bulk assign input", () => {
    const result = ideaBulkAssignBucketInput.safeParse({
      ideaIds: ["idea-1", "idea-2"],
      bucketId: "bucket-1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty idea list", () => {
    const result = ideaBulkAssignBucketInput.safeParse({
      ideaIds: [],
      bucketId: "bucket-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("ideaBulkArchiveInput", () => {
  it("should accept valid bulk archive input", () => {
    const result = ideaBulkArchiveInput.safeParse({
      ideaIds: ["idea-1"],
      reason: "No longer relevant",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty reason", () => {
    const result = ideaBulkArchiveInput.safeParse({
      ideaIds: ["idea-1"],
      reason: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("ideaBulkExportInput", () => {
  it("should accept valid bulk export input", () => {
    const result = ideaBulkExportInput.safeParse({
      ideaIds: ["idea-1", "idea-2"],
      campaignId: "campaign-1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty idea list", () => {
    const result = ideaBulkExportInput.safeParse({
      ideaIds: [],
      campaignId: "campaign-1",
    });
    expect(result.success).toBe(false);
  });
});
