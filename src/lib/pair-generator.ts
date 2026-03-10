import type { Idea, IdeaPair } from "@/types/evaluation";

interface CompletedPair {
  ideaAId: string;
  ideaBId: string;
}

/**
 * Generates all unique pairs from a list of ideas.
 * For n ideas, generates n*(n-1)/2 pairs.
 * The order within each pair is deterministic (sorted by id).
 */
export function generateAllPairs(ideas: Idea[]): Array<[Idea, Idea]> {
  const pairs: Array<[Idea, Idea]> = [];

  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const [first, second] =
        ideas[i].id < ideas[j].id ? [ideas[i], ideas[j]] : [ideas[j], ideas[i]];
      pairs.push([first, second]);
    }
  }

  return pairs;
}

/**
 * Filters out already completed pairs and returns the remaining pairs
 * in a shuffled order for better evaluation distribution.
 */
export function getRemainingPairs(
  allPairs: Array<[Idea, Idea]>,
  completedPairs: CompletedPair[],
  skippedPairIds: Set<string>,
): Array<[Idea, Idea]> {
  const completedSet = new Set(
    completedPairs.map((p) => normalizePairKey(p.ideaAId, p.ideaBId)),
  );

  return allPairs.filter((pair) => {
    const key = normalizePairKey(pair[0].id, pair[1].id);
    return !completedSet.has(key) && !skippedPairIds.has(key);
  });
}

/**
 * Creates a normalized key for a pair of ideas to ensure
 * consistent lookup regardless of order.
 */
export function normalizePairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * Gets the current pair to evaluate and the overall progress.
 */
export function getCurrentPair(
  ideas: Idea[],
  completedPairs: CompletedPair[],
  skippedPairIds: Set<string>,
  currentIndex: number,
): IdeaPair | null {
  const allPairs = generateAllPairs(ideas);
  const remaining = getRemainingPairs(allPairs, completedPairs, skippedPairIds);

  if (remaining.length === 0 || currentIndex >= remaining.length) {
    return null;
  }

  const pair = remaining[currentIndex];

  return {
    ideaA: pair[0],
    ideaB: pair[1],
    pairIndex: completedPairs.length + skippedPairIds.size + currentIndex,
    totalPairs: allPairs.length,
  };
}

/**
 * Calculates the total number of pairs for a given number of ideas.
 */
export function calculateTotalPairs(ideaCount: number): number {
  if (ideaCount < 2) return 0;
  return (ideaCount * (ideaCount - 1)) / 2;
}

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Returns a new array (does not mutate the original).
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
