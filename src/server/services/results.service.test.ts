import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEnhancedResults,
  getShortlist,
  addToShortlist,
  removeFromShortlist,
  lockShortlist,
  forwardShortlistItem,
  forwardAllShortlistItems,
} from "./results.service";
import { EvaluationServiceError } from "./evaluation.schemas";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    evaluationSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    evaluationResponse: {
      findMany: vi.fn(),
    },
    evaluationSessionIdea: {
      findUnique: vi.fn(),
    },
    evaluationShortlistItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    idea: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");

const mockPrisma = prisma as unknown as {
  evaluationSession: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  evaluationResponse: { findMany: ReturnType<typeof vi.fn> };
  evaluationSessionIdea: { findUnique: ReturnType<typeof vi.fn> };
  evaluationShortlistItem: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  idea: { update: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Enhanced Results ─────────────────────────────────────

describe("getEnhancedResults", () => {
  it("should calculate weighted scores and rankings", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      title: "Test Session",
      type: "SCORECARD",
      status: "COMPLETED",
      shortlistLocked: false,
      criteria: [
        {
          id: "crit-1",
          title: "Innovation",
          fieldType: "SELECTION_SCALE",
          weight: 2,
          sortOrder: 0,
          scaleMin: 1,
          scaleMax: 5,
        },
        {
          id: "crit-2",
          title: "Feasibility",
          fieldType: "SELECTION_SCALE",
          weight: 1,
          sortOrder: 1,
          scaleMin: 1,
          scaleMax: 5,
        },
      ],
      ideas: [
        {
          ideaId: "idea-1",
          idea: { id: "idea-1", title: "Idea A", teaser: "Teaser A", status: "EVALUATION" },
        },
        {
          ideaId: "idea-2",
          idea: { id: "idea-2", title: "Idea B", teaser: "Teaser B", status: "EVALUATION" },
        },
      ],
      shortlistItems: [{ ideaId: "idea-1" }],
    });

    mockPrisma.evaluationResponse.findMany.mockResolvedValue([
      { ideaId: "idea-1", criterionId: "crit-1", scoreValue: 5 },
      { ideaId: "idea-1", criterionId: "crit-1", scoreValue: 4 },
      { ideaId: "idea-1", criterionId: "crit-2", scoreValue: 3 },
      { ideaId: "idea-2", criterionId: "crit-1", scoreValue: 2 },
      { ideaId: "idea-2", criterionId: "crit-2", scoreValue: 4 },
    ]);

    const result = await getEnhancedResults({ sessionId: "session-1" });

    expect(result.sessionId).toBe("session-1");
    expect(result.results).toHaveLength(2);

    // Idea A should rank higher (higher weighted score)
    expect(result.results[0].ideaId).toBe("idea-1");
    expect(result.results[0].rank).toBe(1);
    expect(result.results[0].isShortlisted).toBe(true);

    expect(result.results[1].ideaId).toBe("idea-2");
    expect(result.results[1].rank).toBe(2);
    expect(result.results[1].isShortlisted).toBe(false);

    // Check normalized scores exist
    expect(result.results[0].normalizedScore).toBeGreaterThan(0);
  });

  it("should flag controversial ratings with high std dev", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      title: "Test",
      type: "SCORECARD",
      status: "COMPLETED",
      shortlistLocked: false,
      criteria: [
        {
          id: "crit-1",
          title: "Innovation",
          fieldType: "SELECTION_SCALE",
          weight: 1,
          sortOrder: 0,
          scaleMin: 1,
          scaleMax: 5,
        },
      ],
      ideas: [
        {
          ideaId: "idea-1",
          idea: { id: "idea-1", title: "Controversial Idea", teaser: null, status: "EVALUATION" },
        },
      ],
      shortlistItems: [],
    });

    // High variance scores: 1 and 5 => std dev > 1.5
    mockPrisma.evaluationResponse.findMany.mockResolvedValue([
      { ideaId: "idea-1", criterionId: "crit-1", scoreValue: 1 },
      { ideaId: "idea-1", criterionId: "crit-1", scoreValue: 5 },
    ]);

    const result = await getEnhancedResults({ sessionId: "session-1" });

    expect(result.results[0].criteriaScores[0].isControversial).toBe(true);
    expect(result.results[0].criteriaScores[0].standardDeviation).toBeGreaterThanOrEqual(1.5);
  });

  it("should throw if session not found", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue(null);

    await expect(getEnhancedResults({ sessionId: "nonexistent" })).rejects.toThrow(
      EvaluationServiceError,
    );
  });
});

// ── Shortlist Management ─────────────────────────────────

describe("getShortlist", () => {
  it("should return shortlist items", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: false,
      shortlistLockedAt: null,
      shortlistLockedById: null,
      shortlistItems: [
        {
          id: "item-1",
          ideaId: "idea-1",
          addedById: "user-1",
          addedAt: new Date("2026-01-01"),
          forwardedTo: null,
          forwardedAt: null,
          idea: { id: "idea-1", title: "Test Idea", teaser: "Teaser", status: "EVALUATION" },
        },
      ],
    });

    const result = await getShortlist({ sessionId: "session-1" });

    expect(result.isLocked).toBe(false);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].ideaId).toBe("idea-1");
  });
});

describe("addToShortlist", () => {
  it("should add idea to shortlist", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: false,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationSessionIdea.findUnique.mockResolvedValue({ id: "esi-1" });
    mockPrisma.evaluationShortlistItem.findUnique.mockResolvedValue(null);
    mockPrisma.evaluationShortlistItem.create.mockResolvedValue({});

    const result = await addToShortlist({ sessionId: "session-1", ideaId: "idea-1" }, "user-1");

    expect(result.added).toBe(true);
    expect(result.alreadyExists).toBe(false);
  });

  it("should reject when shortlist is locked", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: true,
      campaignId: "campaign-1",
    });

    await expect(
      addToShortlist({ sessionId: "session-1", ideaId: "idea-1" }, "user-1"),
    ).rejects.toThrow("Shortlist is locked");
  });

  it("should return alreadyExists when idea is already shortlisted", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: false,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationSessionIdea.findUnique.mockResolvedValue({ id: "esi-1" });
    mockPrisma.evaluationShortlistItem.findUnique.mockResolvedValue({ id: "existing" });

    const result = await addToShortlist({ sessionId: "session-1", ideaId: "idea-1" }, "user-1");

    expect(result.added).toBe(false);
    expect(result.alreadyExists).toBe(true);
  });
});

describe("removeFromShortlist", () => {
  it("should remove idea from shortlist", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: false,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationShortlistItem.findUnique.mockResolvedValue({ id: "item-1" });
    mockPrisma.evaluationShortlistItem.delete.mockResolvedValue({});

    const result = await removeFromShortlist(
      { sessionId: "session-1", ideaId: "idea-1" },
      "user-1",
    );

    expect(result.removed).toBe(true);
  });

  it("should reject when shortlist is locked", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: true,
      campaignId: "campaign-1",
    });

    await expect(
      removeFromShortlist({ sessionId: "session-1", ideaId: "idea-1" }, "user-1"),
    ).rejects.toThrow("Shortlist is locked");
  });
});

describe("lockShortlist", () => {
  it("should lock the shortlist", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: false,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationSession.update.mockResolvedValue({});

    const result = await lockShortlist({ sessionId: "session-1" }, "user-1");

    expect(result.locked).toBe(true);
    expect(mockPrisma.evaluationSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ shortlistLocked: true }),
      }),
    );
  });

  it("should reject if already locked", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: true,
      campaignId: "campaign-1",
    });

    await expect(lockShortlist({ sessionId: "session-1" }, "user-1")).rejects.toThrow(
      "Shortlist is already locked",
    );
  });
});

describe("forwardShortlistItem", () => {
  it("should forward a shortlisted idea to implementation", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: true,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationShortlistItem.findUnique.mockResolvedValue({ id: "item-1" });
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await forwardShortlistItem(
      { sessionId: "session-1", ideaId: "idea-1", destination: "IMPLEMENTATION" },
      "user-1",
    );

    expect(result.forwarded).toBe(true);
    expect(result.destination).toBe("IMPLEMENTATION");
  });

  it("should reject if shortlist is not locked", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: false,
      campaignId: "campaign-1",
    });

    await expect(
      forwardShortlistItem(
        { sessionId: "session-1", ideaId: "idea-1", destination: "IMPLEMENTATION" },
        "user-1",
      ),
    ).rejects.toThrow("Shortlist must be locked before forwarding");
  });
});

describe("forwardAllShortlistItems", () => {
  it("should forward all unforwarded items", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: true,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationShortlistItem.findMany.mockResolvedValue([
      { id: "item-1", ideaId: "idea-1" },
      { id: "item-2", ideaId: "idea-2" },
    ]);
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await forwardAllShortlistItems(
      { sessionId: "session-1", target: "ARCHIVED" },
      "user-1",
    );

    expect(result.forwarded).toBe(2);
  });

  it("should return 0 when no items to forward", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "session-1",
      shortlistLocked: true,
      campaignId: "campaign-1",
    });
    mockPrisma.evaluationShortlistItem.findMany.mockResolvedValue([]);

    const result = await forwardAllShortlistItems(
      { sessionId: "session-1", target: "CONCEPT" },
      "user-1",
    );

    expect(result.forwarded).toBe(0);
  });
});
