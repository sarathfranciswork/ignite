import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getShortlist,
  addIdeasToShortlist,
  removeIdeaFromShortlist,
  lockShortlist,
  forwardShortlistedIdea,
  updateShortlistEntry,
} from "./shortlist.service";
import { EvaluationServiceError } from "./evaluation.schemas";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    evaluationSession: {
      findUnique: vi.fn(),
    },
    evaluationSessionIdea: {
      findMany: vi.fn(),
    },
    shortlist: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    shortlistEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const mockPrisma = prisma as unknown as {
  evaluationSession: { findUnique: ReturnType<typeof vi.fn> };
  evaluationSessionIdea: { findMany: ReturnType<typeof vi.fn> };
  shortlist: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  shortlistEntry: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
};

const mockEventBus = eventBus as unknown as { emit: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getShortlist", () => {
  it("returns empty shortlist when none exists", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "COMPLETED",
      campaignId: "c1",
      title: "Test",
    });
    mockPrisma.shortlist.findUnique.mockResolvedValue(null);

    const result = await getShortlist({ sessionId: "s1" });
    expect(result.exists).toBe(false);
    expect(result.entries).toEqual([]);
    expect(result.isLocked).toBe(false);
  });

  it("throws SESSION_NOT_FOUND when session missing", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue(null);

    await expect(getShortlist({ sessionId: "missing" })).rejects.toThrow(EvaluationServiceError);
  });

  it("returns existing shortlist with entries", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "COMPLETED",
      campaignId: "c1",
      title: "Test",
    });
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: true,
      lockedAt: new Date("2026-01-01"),
      entries: [
        {
          ideaId: "i1",
          rank: 0,
          notes: null,
          forwardedTo: null,
          forwardedAt: null,
          idea: { id: "i1", title: "Idea 1", teaser: "Teaser", status: "EVALUATION" },
        },
      ],
    });

    const result = await getShortlist({ sessionId: "s1" });
    expect(result.exists).toBe(true);
    expect(result.isLocked).toBe(true);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].ideaTitle).toBe("Idea 1");
  });
});

describe("addIdeasToShortlist", () => {
  it("creates shortlist and adds ideas", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "c1",
      title: "Test",
    });
    mockPrisma.evaluationSessionIdea.findMany.mockResolvedValue([
      { ideaId: "i1" },
      { ideaId: "i2" },
    ]);
    mockPrisma.shortlist.upsert.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: false,
    });
    mockPrisma.shortlistEntry.aggregate.mockResolvedValue({ _max: { rank: null } });
    mockPrisma.shortlistEntry.findMany.mockResolvedValue([]);
    mockPrisma.shortlistEntry.createMany.mockResolvedValue({ count: 2 });

    const result = await addIdeasToShortlist({ sessionId: "s1", ideaIds: ["i1", "i2"] }, "user1");

    expect(result.added).toBe(2);
    expect(mockPrisma.shortlistEntry.createMany).toHaveBeenCalled();
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      "evaluation.shortlistUpdated",
      expect.objectContaining({ entity: "shortlist" }),
    );
  });

  it("throws when idea not in session", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "c1",
      title: "Test",
    });
    mockPrisma.evaluationSessionIdea.findMany.mockResolvedValue([{ ideaId: "i1" }]);

    await expect(
      addIdeasToShortlist({ sessionId: "s1", ideaIds: ["i1", "i999"] }, "user1"),
    ).rejects.toThrow("Ideas not found in session");
  });

  it("prevents adding when shortlist is locked", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "c1",
      title: "Test",
    });
    mockPrisma.evaluationSessionIdea.findMany.mockResolvedValue([{ ideaId: "i1" }]);
    mockPrisma.shortlist.upsert.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: true,
    });

    await expect(
      addIdeasToShortlist({ sessionId: "s1", ideaIds: ["i1"] }, "user1"),
    ).rejects.toThrow("Shortlist is locked");
  });

  it("skips duplicate ideas", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      campaignId: "c1",
      title: "Test",
    });
    mockPrisma.evaluationSessionIdea.findMany.mockResolvedValue([{ ideaId: "i1" }]);
    mockPrisma.shortlist.upsert.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: false,
    });
    mockPrisma.shortlistEntry.aggregate.mockResolvedValue({ _max: { rank: 0 } });
    mockPrisma.shortlistEntry.findMany.mockResolvedValue([{ ideaId: "i1" }]);

    const result = await addIdeasToShortlist({ sessionId: "s1", ideaIds: ["i1"] }, "user1");

    expect(result.added).toBe(0);
  });
});

describe("removeIdeaFromShortlist", () => {
  it("removes idea from shortlist", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: false,
    });
    mockPrisma.shortlistEntry.findUnique.mockResolvedValue({
      id: "se1",
      shortlistId: "sl1",
      ideaId: "i1",
    });
    mockPrisma.shortlistEntry.delete.mockResolvedValue({});

    const result = await removeIdeaFromShortlist({ sessionId: "s1", ideaId: "i1" }, "user1");

    expect(result.removed).toBe(true);
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      "evaluation.shortlistUpdated",
      expect.objectContaining({ entity: "shortlist" }),
    );
  });

  it("throws when shortlist is locked", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: true,
    });

    await expect(
      removeIdeaFromShortlist({ sessionId: "s1", ideaId: "i1" }, "user1"),
    ).rejects.toThrow("Shortlist is locked");
  });
});

describe("lockShortlist", () => {
  it("locks the shortlist", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: false,
      _count: { entries: 3 },
    });
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({ campaignId: "c1" });
    mockPrisma.shortlist.update.mockResolvedValue({
      isLocked: true,
      lockedAt: new Date("2026-01-01"),
    });

    const result = await lockShortlist({ sessionId: "s1" }, "user1");

    expect(result.isLocked).toBe(true);
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      "evaluation.shortlistLocked",
      expect.objectContaining({ entity: "shortlist" }),
    );
  });

  it("throws when shortlist is empty", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: false,
      _count: { entries: 0 },
    });

    await expect(lockShortlist({ sessionId: "s1" }, "user1")).rejects.toThrow(
      "Cannot lock an empty shortlist",
    );
  });

  it("throws when already locked", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: true,
      _count: { entries: 3 },
    });

    await expect(lockShortlist({ sessionId: "s1" }, "user1")).rejects.toThrow(
      "Shortlist is already locked",
    );
  });
});

describe("forwardShortlistedIdea", () => {
  it("forwards an idea to a destination", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
    });
    mockPrisma.shortlistEntry.findUnique.mockResolvedValue({
      id: "se1",
      shortlistId: "sl1",
      ideaId: "i1",
    });
    mockPrisma.shortlistEntry.update.mockResolvedValue({
      forwardedTo: "IMPLEMENTATION",
      forwardedAt: new Date("2026-01-01"),
    });
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({ campaignId: "c1" });

    const result = await forwardShortlistedIdea(
      { sessionId: "s1", ideaId: "i1", destination: "IMPLEMENTATION" },
      "user1",
    );

    expect(result.forwardedTo).toBe("IMPLEMENTATION");
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      "evaluation.shortlistIdeaForwarded",
      expect.objectContaining({ entity: "shortlistEntry" }),
    );
  });
});

describe("updateShortlistEntry", () => {
  it("updates rank and notes", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: false,
    });
    mockPrisma.shortlistEntry.findUnique.mockResolvedValue({
      id: "se1",
      shortlistId: "sl1",
      ideaId: "i1",
    });
    mockPrisma.shortlistEntry.update.mockResolvedValue({
      ideaId: "i1",
      rank: 5,
      notes: "Great idea",
    });

    const result = await updateShortlistEntry(
      { sessionId: "s1", ideaId: "i1", rank: 5, notes: "Great idea" },
      "user1",
    );

    expect(result.rank).toBe(5);
    expect(result.notes).toBe("Great idea");
  });

  it("throws when shortlist is locked", async () => {
    mockPrisma.shortlist.findUnique.mockResolvedValue({
      id: "sl1",
      sessionId: "s1",
      isLocked: true,
    });

    await expect(
      updateShortlistEntry({ sessionId: "s1", ideaId: "i1", rank: 5 }, "user1"),
    ).rejects.toThrow("Shortlist is locked");
  });
});
