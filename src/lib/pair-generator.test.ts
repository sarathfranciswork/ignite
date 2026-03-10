import { describe, it, expect } from "vitest";
import {
  generateAllPairs,
  getRemainingPairs,
  normalizePairKey,
  getCurrentPair,
  calculateTotalPairs,
  shuffleArray,
} from "./pair-generator";
import type { Idea } from "@/types/evaluation";

function makeIdea(id: string, title?: string): Idea {
  return {
    id,
    title: title ?? `Idea ${id}`,
    description: `Description for ${id}`,
    authorName: "Test Author",
    createdAt: new Date().toISOString(),
    imageUrl: null,
    commentCount: 0,
    likeCount: 0,
  };
}

describe("generateAllPairs", () => {
  it("generates correct number of pairs for 4 ideas", () => {
    const ideas = [makeIdea("a"), makeIdea("b"), makeIdea("c"), makeIdea("d")];
    const pairs = generateAllPairs(ideas);
    expect(pairs).toHaveLength(6); // 4 choose 2 = 6
  });

  it("generates correct number of pairs for 2 ideas", () => {
    const ideas = [makeIdea("a"), makeIdea("b")];
    const pairs = generateAllPairs(ideas);
    expect(pairs).toHaveLength(1);
  });

  it("returns empty array for fewer than 2 ideas", () => {
    expect(generateAllPairs([])).toHaveLength(0);
    expect(generateAllPairs([makeIdea("a")])).toHaveLength(0);
  });

  it("ensures deterministic pair ordering (sorted by id)", () => {
    const ideas = [makeIdea("z"), makeIdea("a"), makeIdea("m")];
    const pairs = generateAllPairs(ideas);

    for (const [first, second] of pairs) {
      expect(first.id < second.id).toBe(true);
    }
  });

  it("generates all unique combinations", () => {
    const ideas = [makeIdea("1"), makeIdea("2"), makeIdea("3")];
    const pairs = generateAllPairs(ideas);
    const pairKeys = pairs.map((p) => `${p[0].id}-${p[1].id}`);

    expect(pairKeys).toContain("1-2");
    expect(pairKeys).toContain("1-3");
    expect(pairKeys).toContain("2-3");
    expect(new Set(pairKeys).size).toBe(3);
  });
});

describe("normalizePairKey", () => {
  it("returns consistent key regardless of order", () => {
    expect(normalizePairKey("a", "b")).toBe("a:b");
    expect(normalizePairKey("b", "a")).toBe("a:b");
  });

  it("handles equal ids", () => {
    expect(normalizePairKey("x", "x")).toBe("x:x");
  });
});

describe("getRemainingPairs", () => {
  it("excludes completed pairs", () => {
    const ideas = [makeIdea("a"), makeIdea("b"), makeIdea("c")];
    const allPairs = generateAllPairs(ideas);
    const completed = [{ ideaAId: "a", ideaBId: "b" }];
    const remaining = getRemainingPairs(allPairs, completed, new Set());

    expect(remaining).toHaveLength(2);
    expect(remaining.some((p) => p[0].id === "a" && p[1].id === "b")).toBe(
      false,
    );
  });

  it("excludes skipped pairs", () => {
    const ideas = [makeIdea("a"), makeIdea("b"), makeIdea("c")];
    const allPairs = generateAllPairs(ideas);
    const skipped = new Set([normalizePairKey("a", "c")]);
    const remaining = getRemainingPairs(allPairs, [], skipped);

    expect(remaining).toHaveLength(2);
    expect(remaining.some((p) => p[0].id === "a" && p[1].id === "c")).toBe(
      false,
    );
  });

  it("returns all pairs when none completed or skipped", () => {
    const ideas = [makeIdea("a"), makeIdea("b"), makeIdea("c")];
    const allPairs = generateAllPairs(ideas);
    const remaining = getRemainingPairs(allPairs, [], new Set());

    expect(remaining).toHaveLength(3);
  });

  it("returns empty when all pairs completed", () => {
    const ideas = [makeIdea("a"), makeIdea("b")];
    const allPairs = generateAllPairs(ideas);
    const completed = [{ ideaAId: "a", ideaBId: "b" }];
    const remaining = getRemainingPairs(allPairs, completed, new Set());

    expect(remaining).toHaveLength(0);
  });
});

describe("getCurrentPair", () => {
  it("returns the first remaining pair", () => {
    const ideas = [makeIdea("a"), makeIdea("b"), makeIdea("c")];
    const pair = getCurrentPair(ideas, [], new Set(), 0);

    expect(pair).not.toBeNull();
    expect(pair?.ideaA.id).toBe("a");
    expect(pair?.ideaB.id).toBe("b");
    expect(pair?.totalPairs).toBe(3);
  });

  it("returns null when all pairs completed", () => {
    const ideas = [makeIdea("a"), makeIdea("b")];
    const completed = [{ ideaAId: "a", ideaBId: "b" }];
    const pair = getCurrentPair(ideas, completed, new Set(), 0);

    expect(pair).toBeNull();
  });

  it("returns null when index exceeds remaining", () => {
    const ideas = [makeIdea("a"), makeIdea("b")];
    const pair = getCurrentPair(ideas, [], new Set(), 5);

    expect(pair).toBeNull();
  });

  it("skips completed pairs when getting current", () => {
    const ideas = [makeIdea("a"), makeIdea("b"), makeIdea("c")];
    const completed = [{ ideaAId: "a", ideaBId: "b" }];
    const pair = getCurrentPair(ideas, completed, new Set(), 0);

    expect(pair).not.toBeNull();
    // Should not be the completed pair
    expect(pair?.ideaA.id === "a" && pair?.ideaB.id === "b").toBe(false);
  });
});

describe("calculateTotalPairs", () => {
  it("calculates correctly for various counts", () => {
    expect(calculateTotalPairs(0)).toBe(0);
    expect(calculateTotalPairs(1)).toBe(0);
    expect(calculateTotalPairs(2)).toBe(1);
    expect(calculateTotalPairs(3)).toBe(3);
    expect(calculateTotalPairs(4)).toBe(6);
    expect(calculateTotalPairs(5)).toBe(10);
    expect(calculateTotalPairs(10)).toBe(45);
  });
});

describe("shuffleArray", () => {
  it("returns a new array with the same elements", () => {
    const original = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(original);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  it("does not mutate the original array", () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffleArray(original);

    expect(original).toEqual(copy);
  });

  it("handles empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles single element", () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});
