import { describe, it, expect, beforeEach } from "vitest";
import { usePairwiseEvaluationStore } from "./pairwise-evaluation.store";
import type { Idea, EvaluationCriterion } from "@/types/evaluation";
import { EvalFieldType } from "@/types/evaluation";

function makeIdea(id: string): Idea {
  return {
    id,
    title: `Idea ${id}`,
    description: `Description for ${id}`,
    authorName: "Test Author",
    createdAt: new Date().toISOString(),
    imageUrl: null,
    commentCount: 0,
    likeCount: 0,
  };
}

function makeCriterion(id: string, sortOrder: number): EvaluationCriterion {
  return {
    id,
    sessionId: "session-1",
    name: `Criterion ${id}`,
    description: null,
    fieldType: EvalFieldType.SELECTION_5,
    isMandatory: true,
    sortOrder,
    options: null,
    higherIsBetter: true,
  };
}

describe("usePairwiseEvaluationStore", () => {
  const ideas: Idea[] = [makeIdea("a"), makeIdea("b"), makeIdea("c")];
  const criteria: EvaluationCriterion[] = [
    makeCriterion("c1", 0),
    makeCriterion("c2", 1),
  ];

  beforeEach(() => {
    usePairwiseEvaluationStore.getState().reset();
  });

  describe("initialize", () => {
    it("sets up state correctly", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      const state = usePairwiseEvaluationStore.getState();
      expect(state.sessionId).toBe("session-1");
      expect(state.ideas).toEqual(ideas);
      expect(state.criteria).toEqual(criteria);
      expect(state.completedComparisons).toEqual([]);
      expect(state.currentScores.get("c1")).toBe(0);
      expect(state.currentScores.get("c2")).toBe(0);
    });
  });

  describe("getCurrentPair", () => {
    it("returns the first pair after initialization", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      const pair = usePairwiseEvaluationStore.getState().getCurrentPair();
      expect(pair).not.toBeNull();
      expect(pair?.totalPairs).toBe(3); // 3 choose 2 = 3
    });

    it("returns null when no ideas", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", [], criteria);

      const pair = usePairwiseEvaluationStore.getState().getCurrentPair();
      expect(pair).toBeNull();
    });
  });

  describe("setScore", () => {
    it("updates the score for a criterion", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      usePairwiseEvaluationStore.getState().setScore("c1", 0.75);
      expect(
        usePairwiseEvaluationStore.getState().currentScores.get("c1"),
      ).toBe(0.75);
    });
  });

  describe("submitCurrentPair", () => {
    it("adds comparison to completed list", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      usePairwiseEvaluationStore.getState().setScore("c1", 0.5);
      usePairwiseEvaluationStore.getState().setScore("c2", -0.3);

      const comparison = usePairwiseEvaluationStore
        .getState()
        .submitCurrentPair();
      expect(comparison).not.toBeNull();
      expect(comparison?.scores).toHaveLength(2);

      const state = usePairwiseEvaluationStore.getState();
      expect(state.completedComparisons).toHaveLength(1);
    });

    it("resets scores after submission", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      usePairwiseEvaluationStore.getState().setScore("c1", 0.5);
      usePairwiseEvaluationStore.getState().submitCurrentPair();

      const state = usePairwiseEvaluationStore.getState();
      expect(state.currentScores.get("c1")).toBe(0);
      expect(state.currentScores.get("c2")).toBe(0);
    });

    it("advances to next pair after submission", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      const firstPair = usePairwiseEvaluationStore.getState().getCurrentPair();
      usePairwiseEvaluationStore.getState().submitCurrentPair();

      const secondPair = usePairwiseEvaluationStore.getState().getCurrentPair();

      expect(secondPair).not.toBeNull();
      // Should not be the same pair
      expect(
        secondPair?.ideaA.id === firstPair?.ideaA.id &&
          secondPair?.ideaB.id === firstPair?.ideaB.id,
      ).toBe(false);
    });

    it("returns null when no more pairs", () => {
      const twoIdeas = [makeIdea("a"), makeIdea("b")];
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", twoIdeas, criteria);

      usePairwiseEvaluationStore.getState().submitCurrentPair();

      // Only one pair possible with 2 ideas
      const pair = usePairwiseEvaluationStore.getState().getCurrentPair();
      expect(pair).toBeNull();
    });
  });

  describe("skipCurrentPair", () => {
    it("skips the current pair and moves to next", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      const firstPair = usePairwiseEvaluationStore.getState().getCurrentPair();
      usePairwiseEvaluationStore.getState().skipCurrentPair();

      const state = usePairwiseEvaluationStore.getState();
      expect(state.skippedPairKeys.size).toBe(1);
      expect(state.completedComparisons).toHaveLength(0);

      const nextPair = state.getCurrentPair();
      expect(nextPair).not.toBeNull();
      expect(
        nextPair?.ideaA.id === firstPair?.ideaA.id &&
          nextPair?.ideaB.id === firstPair?.ideaB.id,
      ).toBe(false);
    });
  });

  describe("getProgress", () => {
    it("starts at 0%", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      const progress = usePairwiseEvaluationStore.getState().getProgress();
      expect(progress.completedPairs).toBe(0);
      expect(progress.totalPairs).toBe(3);
      expect(progress.skippedPairs).toBe(0);
      expect(progress.percentComplete).toBe(0);
    });

    it("tracks completed pairs", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      usePairwiseEvaluationStore.getState().submitCurrentPair();

      const progress = usePairwiseEvaluationStore.getState().getProgress();
      expect(progress.completedPairs).toBe(1);
      expect(progress.percentComplete).toBe(33);
    });

    it("tracks skipped pairs in progress", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      usePairwiseEvaluationStore.getState().skipCurrentPair();

      const progress = usePairwiseEvaluationStore.getState().getProgress();
      expect(progress.skippedPairs).toBe(1);
      expect(progress.percentComplete).toBe(33);
    });

    it("reaches 100% when all pairs are done", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);

      // Complete all 3 pairs
      usePairwiseEvaluationStore.getState().submitCurrentPair();
      usePairwiseEvaluationStore.getState().submitCurrentPair();
      usePairwiseEvaluationStore.getState().submitCurrentPair();

      const progress = usePairwiseEvaluationStore.getState().getProgress();
      expect(progress.completedPairs).toBe(3);
      expect(progress.percentComplete).toBe(100);
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      const store = usePairwiseEvaluationStore.getState();
      store.initialize("session-1", ideas, criteria);
      usePairwiseEvaluationStore.getState().submitCurrentPair();
      usePairwiseEvaluationStore.getState().reset();

      const state = usePairwiseEvaluationStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.ideas).toEqual([]);
      expect(state.completedComparisons).toEqual([]);
    });
  });
});
