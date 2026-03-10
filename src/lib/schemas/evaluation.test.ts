import { describe, it, expect } from "vitest";
import { pairwiseScoreSchema, pairwiseSubmissionSchema } from "./evaluation";

describe("pairwiseScoreSchema", () => {
  it("accepts valid score", () => {
    const result = pairwiseScoreSchema.safeParse({
      criterionId: "crit-1",
      score: 0.5,
    });
    expect(result.success).toBe(true);
  });

  it("accepts boundary values", () => {
    expect(
      pairwiseScoreSchema.safeParse({ criterionId: "c", score: -1 }).success,
    ).toBe(true);
    expect(
      pairwiseScoreSchema.safeParse({ criterionId: "c", score: 1 }).success,
    ).toBe(true);
    expect(
      pairwiseScoreSchema.safeParse({ criterionId: "c", score: 0 }).success,
    ).toBe(true);
  });

  it("rejects score out of range", () => {
    expect(
      pairwiseScoreSchema.safeParse({ criterionId: "c", score: 1.5 }).success,
    ).toBe(false);
    expect(
      pairwiseScoreSchema.safeParse({ criterionId: "c", score: -2 }).success,
    ).toBe(false);
  });

  it("rejects empty criterionId", () => {
    expect(
      pairwiseScoreSchema.safeParse({ criterionId: "", score: 0 }).success,
    ).toBe(false);
  });
});

describe("pairwiseSubmissionSchema", () => {
  it("accepts valid submission", () => {
    const result = pairwiseSubmissionSchema.safeParse({
      sessionId: "sess-1",
      ideaAId: "idea-1",
      ideaBId: "idea-2",
      scores: [{ criterionId: "crit-1", score: 0.3 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty scores array", () => {
    const result = pairwiseSubmissionSchema.safeParse({
      sessionId: "sess-1",
      ideaAId: "idea-1",
      ideaBId: "idea-2",
      scores: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(
      pairwiseSubmissionSchema.safeParse({
        ideaAId: "idea-1",
        ideaBId: "idea-2",
        scores: [{ criterionId: "c", score: 0 }],
      }).success,
    ).toBe(false);
  });
});
