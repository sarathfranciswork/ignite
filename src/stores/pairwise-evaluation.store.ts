import { create } from "zustand";
import type {
  Idea,
  EvaluationCriterion,
  PairwiseScore,
  EvaluationProgress,
  IdeaPair,
} from "@/types/evaluation";
import {
  generateAllPairs,
  normalizePairKey,
  calculateTotalPairs,
} from "@/lib/pair-generator";

interface CompletedComparison {
  ideaAId: string;
  ideaBId: string;
  scores: PairwiseScore[];
}

interface PairwiseEvaluationState {
  sessionId: string | null;
  ideas: Idea[];
  criteria: EvaluationCriterion[];
  currentPairIndex: number;
  completedComparisons: CompletedComparison[];
  skippedPairKeys: Set<string>;
  currentScores: Map<string, number>;
  isSubmitting: boolean;

  // Actions
  initialize: (
    sessionId: string,
    ideas: Idea[],
    criteria: EvaluationCriterion[],
  ) => void;
  setScore: (criterionId: string, score: number) => void;
  submitCurrentPair: () => CompletedComparison | null;
  skipCurrentPair: () => void;
  reset: () => void;

  // Computed
  getCurrentPair: () => IdeaPair | null;
  getProgress: () => EvaluationProgress;
  getAllRemainingPairs: () => Array<[Idea, Idea]>;
}

export const usePairwiseEvaluationStore = create<PairwiseEvaluationState>(
  (set, get) => ({
    sessionId: null,
    ideas: [],
    criteria: [],
    currentPairIndex: 0,
    completedComparisons: [],
    skippedPairKeys: new Set<string>(),
    currentScores: new Map<string, number>(),
    isSubmitting: false,

    initialize: (sessionId, ideas, criteria) => {
      set({
        sessionId,
        ideas,
        criteria,
        currentPairIndex: 0,
        completedComparisons: [],
        skippedPairKeys: new Set<string>(),
        currentScores: new Map<string, number>(criteria.map((c) => [c.id, 0])),
        isSubmitting: false,
      });
    },

    setScore: (criterionId, score) => {
      set((state) => {
        const newScores = new Map(state.currentScores);
        newScores.set(criterionId, score);
        return { currentScores: newScores };
      });
    },

    submitCurrentPair: () => {
      const state = get();
      const currentPair = state.getCurrentPair();

      if (!currentPair) return null;

      const scores: PairwiseScore[] = Array.from(
        state.currentScores.entries(),
      ).map(([criterionId, score]) => ({
        criterionId,
        score,
      }));

      const comparison: CompletedComparison = {
        ideaAId: currentPair.ideaA.id,
        ideaBId: currentPair.ideaB.id,
        scores,
      };

      set((state) => ({
        completedComparisons: [...state.completedComparisons, comparison],
        currentPairIndex: 0,
        currentScores: new Map<string, number>(
          state.criteria.map((c) => [c.id, 0]),
        ),
      }));

      return comparison;
    },

    skipCurrentPair: () => {
      const state = get();
      const currentPair = state.getCurrentPair();

      if (!currentPair) return;

      const pairKey = normalizePairKey(
        currentPair.ideaA.id,
        currentPair.ideaB.id,
      );

      set((state) => {
        const newSkipped = new Set(state.skippedPairKeys);
        newSkipped.add(pairKey);
        return {
          skippedPairKeys: newSkipped,
          currentPairIndex: 0,
          currentScores: new Map<string, number>(
            state.criteria.map((c) => [c.id, 0]),
          ),
        };
      });
    },

    reset: () => {
      set({
        sessionId: null,
        ideas: [],
        criteria: [],
        currentPairIndex: 0,
        completedComparisons: [],
        skippedPairKeys: new Set<string>(),
        currentScores: new Map<string, number>(),
        isSubmitting: false,
      });
    },

    getCurrentPair: () => {
      const state = get();
      const remaining = state.getAllRemainingPairs();

      if (remaining.length === 0) return null;

      const allPairsCount = calculateTotalPairs(state.ideas.length);
      const pair = remaining[0];

      return {
        ideaA: pair[0],
        ideaB: pair[1],
        pairIndex:
          state.completedComparisons.length + state.skippedPairKeys.size,
        totalPairs: allPairsCount,
      };
    },

    getProgress: () => {
      const state = get();
      const totalPairs = calculateTotalPairs(state.ideas.length);
      const completedPairs = state.completedComparisons.length;
      const skippedPairs = state.skippedPairKeys.size;

      return {
        completedPairs,
        totalPairs,
        skippedPairs,
        percentComplete:
          totalPairs > 0
            ? Math.round(((completedPairs + skippedPairs) / totalPairs) * 100)
            : 0,
      };
    },

    getAllRemainingPairs: () => {
      const state = get();
      const allPairs = generateAllPairs(state.ideas);

      const completedSet = new Set(
        state.completedComparisons.map((c) =>
          normalizePairKey(c.ideaAId, c.ideaBId),
        ),
      );

      return allPairs.filter((pair) => {
        const key = normalizePairKey(pair[0].id, pair[1].id);
        return !completedSet.has(key) && !state.skippedPairKeys.has(key);
      });
    },
  }),
);
