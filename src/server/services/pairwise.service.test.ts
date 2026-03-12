import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePairsFromIdeas,
  getPairwisePairs,
  getNextPair,
  submitPairwiseComparison,
  getMyComparison,
  getPairwiseProgress,
  getPairwiseResults,
} from "./pairwise.service";
import { EvaluationServiceError } from "./evaluation.schemas";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    evaluationSession: {
      findUnique: vi.fn(),
    },
    evaluationSessionEvaluator: {
      findUnique: vi.fn(),
    },
    evaluationSessionIdea: {
      findMany: vi.fn(),
    },
    pairwiseComparison: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const mockPrisma = prisma as unknown as {
  evaluationSession: { findUnique: ReturnType<typeof vi.fn> };
  evaluationSessionEvaluator: { findUnique: ReturnType<typeof vi.fn> };
  evaluationSessionIdea: { findMany: ReturnType<typeof vi.fn> };
  pairwiseComparison: {
    findMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── generatePairsFromIdeas ───────────────────────────────────

describe("generatePairsFromIdeas", () => {
  it("returns empty array for 0 or 1 ideas", () => {
    expect(generatePairsFromIdeas([])).toEqual([]);
    expect(generatePairsFromIdeas(["a"])).toEqual([]);
  });

  it("generates 1 pair for 2 ideas", () => {
    const pairs = generatePairsFromIdeas(["a", "b"]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ ideaAId: "a", ideaBId: "b", index: 0 });
  });

  it("generates 3 pairs for 3 ideas", () => {
    const pairs = generatePairsFromIdeas(["a", "b", "c"]);
    expect(pairs).toHaveLength(3);
    expect(pairs).toEqual([
      { ideaAId: "a", ideaBId: "b", index: 0 },
      { ideaAId: "a", ideaBId: "c", index: 1 },
      { ideaAId: "b", ideaBId: "c", index: 2 },
    ]);
  });

  it("generates 6 pairs for 4 ideas (N*(N-1)/2)", () => {
    const pairs = generatePairsFromIdeas(["a", "b", "c", "d"]);
    expect(pairs).toHaveLength(6);
  });

  it("generates 10 pairs for 5 ideas", () => {
    const pairs = generatePairsFromIdeas(["a", "b", "c", "d", "e"]);
    expect(pairs).toHaveLength(10);
  });
});

// ── getPairwisePairs ─────────────────────────────────────────

describe("getPairwisePairs", () => {
  it("throws SESSION_NOT_FOUND when session missing", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue(null);

    await expect(getPairwisePairs({ sessionId: "s1" })).rejects.toThrow(EvaluationServiceError);
  });

  it("throws SESSION_NOT_PAIRWISE for scorecard sessions", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "SCORECARD",
      ideas: [],
    });

    await expect(getPairwisePairs({ sessionId: "s1" })).rejects.toThrow("pairwise");
  });

  it("returns pairs for valid pairwise session", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
      ideas: [
        {
          ideaId: "i1",
          sortOrder: 0,
          idea: { id: "i1", title: "Idea 1", teaser: null, status: "SUBMITTED" },
        },
        {
          ideaId: "i2",
          sortOrder: 1,
          idea: { id: "i2", title: "Idea 2", teaser: null, status: "SUBMITTED" },
        },
        {
          ideaId: "i3",
          sortOrder: 2,
          idea: { id: "i3", title: "Idea 3", teaser: null, status: "SUBMITTED" },
        },
      ],
    });

    const result = await getPairwisePairs({ sessionId: "s1" });
    expect(result.totalPairs).toBe(3);
    expect(result.pairs).toHaveLength(3);
  });
});

// ── getNextPair ──────────────────────────────────────────────

describe("getNextPair", () => {
  it("throws NOT_EVALUATOR when user is not assigned", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
      criteria: [{ id: "c1" }],
      ideas: [
        { ideaId: "i1", idea: { id: "i1", title: "A", teaser: null, status: "SUBMITTED" } },
        { ideaId: "i2", idea: { id: "i2", title: "B", teaser: null, status: "SUBMITTED" } },
      ],
    });
    mockPrisma.evaluationSessionEvaluator.findUnique.mockResolvedValue(null);

    await expect(getNextPair({ sessionId: "s1" }, "user1")).rejects.toThrow("not an evaluator");
  });

  it("returns first pair when no comparisons exist", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
      criteria: [{ id: "c1" }],
      ideas: [
        { ideaId: "i1", idea: { id: "i1", title: "A", teaser: null, status: "SUBMITTED" } },
        { ideaId: "i2", idea: { id: "i2", title: "B", teaser: null, status: "SUBMITTED" } },
      ],
    });
    mockPrisma.evaluationSessionEvaluator.findUnique.mockResolvedValue({ id: "e1" });
    mockPrisma.pairwiseComparison.findMany.mockResolvedValue([]);

    const result = await getNextPair({ sessionId: "s1" }, "user1");
    expect(result.completed).toBe(false);
    expect(result.pairIndex).toBe(0);
    expect(result.pair).toBeTruthy();
    expect(result.pair!.ideaA.id).toBe("i1");
    expect(result.pair!.ideaB.id).toBe("i2");
  });

  it("returns completed when all pairs are done", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
      criteria: [{ id: "c1" }],
      ideas: [
        { ideaId: "i1", idea: { id: "i1", title: "A", teaser: null, status: "SUBMITTED" } },
        { ideaId: "i2", idea: { id: "i2", title: "B", teaser: null, status: "SUBMITTED" } },
      ],
    });
    mockPrisma.evaluationSessionEvaluator.findUnique.mockResolvedValue({ id: "e1" });
    mockPrisma.pairwiseComparison.findMany.mockResolvedValue([
      { ideaAId: "i1", ideaBId: "i2", criterionId: "c1" },
    ]);

    const result = await getNextPair({ sessionId: "s1" }, "user1");
    expect(result.completed).toBe(true);
    expect(result.pair).toBeNull();
  });
});

// ── submitPairwiseComparison ─────────────────────────────────

describe("submitPairwiseComparison", () => {
  it("throws SESSION_NOT_ACTIVE for draft session", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
      status: "DRAFT",
      campaignId: "camp1",
    });

    await expect(
      submitPairwiseComparison(
        { sessionId: "s1", ideaAId: "i1", ideaBId: "i2", comparisons: [] },
        "user1",
      ),
    ).rejects.toThrow("active sessions");
  });

  it("submits comparison successfully", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
      status: "ACTIVE",
      campaignId: "camp1",
    });
    mockPrisma.evaluationSessionEvaluator.findUnique.mockResolvedValue({ id: "e1" });
    mockPrisma.evaluationSessionIdea.findMany.mockResolvedValue([
      { ideaId: "i1" },
      { ideaId: "i2" },
    ]);
    mockPrisma.pairwiseComparison.upsert.mockResolvedValue({});
    mockPrisma.$transaction.mockResolvedValue([{}]);

    const result = await submitPairwiseComparison(
      {
        sessionId: "s1",
        ideaAId: "i1",
        ideaBId: "i2",
        comparisons: [{ criterionId: "c1", score: 3 }],
      },
      "user1",
    );

    expect(result.saved).toBe(1);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});

// ── getMyComparison ──────────────────────────────────────────

describe("getMyComparison", () => {
  it("returns existing comparisons", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      type: "PAIRWISE",
    });
    mockPrisma.pairwiseComparison.findMany.mockResolvedValue([
      {
        criterionId: "c1",
        score: 3,
        updatedAt: new Date("2026-01-01"),
      },
    ]);

    const result = await getMyComparison(
      { sessionId: "s1", ideaAId: "i1", ideaBId: "i2" },
      "user1",
    );

    expect(result.comparisons).toHaveLength(1);
    expect(result.comparisons[0].criterionId).toBe("c1");
  });
});

// ── getPairwiseProgress ──────────────────────────────────────

describe("getPairwiseProgress", () => {
  it("calculates progress correctly", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "ACTIVE",
      evaluators: [{ userId: "u1" }, { userId: "u2" }],
      ideas: [{ ideaId: "i1" }, { ideaId: "i2" }, { ideaId: "i3" }],
      criteria: [{ id: "c1" }, { id: "c2" }],
    });

    mockPrisma.pairwiseComparison.groupBy.mockResolvedValue([
      { evaluatorId: "u1", _count: { id: 6 } }, // 3 pairs * 2 criteria = all done
      { evaluatorId: "u2", _count: { id: 3 } }, // half done
    ]);

    const result = await getPairwiseProgress({ sessionId: "s1" });

    // 3 ideas -> 3 pairs, 2 criteria each -> 6 per evaluator
    expect(result.totalPairs).toBe(3);
    expect(result.evaluatorProgress[0].percentage).toBe(100);
    expect(result.evaluatorProgress[1].percentage).toBe(50);
    expect(result.overall.completed).toBe(9);
    expect(result.overall.total).toBe(12);
  });
});

// ── getPairwiseResults ───────────────────────────────────────

describe("getPairwiseResults", () => {
  it("returns Bradley-Terry ranked results", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      title: "Test Session",
      type: "PAIRWISE",
      status: "COMPLETED",
      criteria: [
        { id: "c1", title: "Innovation", fieldType: "SELECTION_SCALE", weight: 1, sortOrder: 0 },
      ],
      ideas: [
        { ideaId: "i1", idea: { id: "i1", title: "Idea 1", teaser: null, status: "SUBMITTED" } },
        { ideaId: "i2", idea: { id: "i2", title: "Idea 2", teaser: null, status: "SUBMITTED" } },
        { ideaId: "i3", idea: { id: "i3", title: "Idea 3", teaser: null, status: "SUBMITTED" } },
      ],
    });

    // i1 beats i2, i1 beats i3, i2 beats i3
    mockPrisma.pairwiseComparison.findMany.mockResolvedValue([
      { ideaAId: "i1", ideaBId: "i2", criterionId: "c1", score: 3 },
      { ideaAId: "i1", ideaBId: "i3", criterionId: "c1", score: 2 },
      { ideaAId: "i2", ideaBId: "i3", criterionId: "c1", score: 1 },
    ]);

    const result = await getPairwiseResults({ sessionId: "s1" });

    expect(result.results).toHaveLength(3);
    // Idea 1 should be ranked highest (wins both matchups)
    expect(result.results[0].ideaId).toBe("i1");
    // Idea 2 should be second
    expect(result.results[1].ideaId).toBe("i2");
    // Idea 3 should be last
    expect(result.results[2].ideaId).toBe("i3");

    // All should have BT scores
    expect(result.results[0].btScore).toBeGreaterThan(0);
    expect(result.results[0].record.wins).toBe(2);
    expect(result.results[0].record.losses).toBe(0);
  });

  it("handles session with no comparisons", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      title: "Test",
      type: "PAIRWISE",
      status: "ACTIVE",
      criteria: [
        { id: "c1", title: "Quality", fieldType: "SELECTION_SCALE", weight: 1, sortOrder: 0 },
      ],
      ideas: [
        { ideaId: "i1", idea: { id: "i1", title: "A", teaser: null, status: "SUBMITTED" } },
        { ideaId: "i2", idea: { id: "i2", title: "B", teaser: null, status: "SUBMITTED" } },
      ],
    });

    mockPrisma.pairwiseComparison.findMany.mockResolvedValue([]);

    const result = await getPairwiseResults({ sessionId: "s1" });

    expect(result.results).toHaveLength(2);
    // With no comparisons, BT scores should be equal (1.0 each)
    expect(result.results[0].btScore).toBe(1);
    expect(result.results[1].btScore).toBe(1);
  });
});
