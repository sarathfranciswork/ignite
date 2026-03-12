import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createAdhocEvaluation,
  listAdhocEvaluations,
  getAdhocEvaluationById,
  deleteAdhocEvaluation,
  activateAdhocEvaluation,
  completeAdhocEvaluation,
  addItemsToAdhocEvaluation,
  createOneTeamEvaluation,
  startOneTeamSession,
  endOneTeamSession,
  createConsensusNote,
  listConsensusNotes,
  AdhocEvaluationServiceError,
} from "./adhoc-evaluation.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    evaluationSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evaluationCriterion: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    evaluationSessionIdea: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    consensusNote: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const mockPrisma = prisma as unknown as {
  evaluationSession: { [key: string]: ReturnType<typeof vi.fn> };
  evaluationCriterion: { [key: string]: ReturnType<typeof vi.fn> };
  evaluationSessionIdea: { [key: string]: ReturnType<typeof vi.fn> };
  consensusNote: { [key: string]: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAdhocEvaluation", () => {
  it("creates an ad-hoc evaluation session", async () => {
    const now = new Date();
    mockPrisma.evaluationSession.create.mockResolvedValue({
      id: "session-1",
      campaignId: null,
      title: "Ad Hoc Test",
      description: "Test evaluation",
      type: "SCORECARD",
      mode: "AD_HOC",
      status: "DRAFT",
      dueDate: null,
      isTemplate: false,
      createdById: "user-1",
      createdAt: now,
      updatedAt: now,
      criteria: [{ id: "c1", title: "Quality", sortOrder: 0 }],
      _count: { evaluators: 0, ideas: 0, responses: 0 },
    });

    const result = await createAdhocEvaluation(
      {
        title: "Ad Hoc Test",
        description: "Test evaluation",
        type: "SCORECARD",
        criteria: [
          {
            title: "Quality",
            fieldType: "SELECTION_SCALE",
            scaleMin: 1,
            scaleMax: 5,
            weight: 1,
            sortOrder: 0,
            isRequired: true,
          },
        ],
      },
      "user-1",
    );

    expect(result.id).toBe("session-1");
    expect(result.mode).toBe("AD_HOC");
    expect(result.type).toBe("SCORECARD");
    expect(mockPrisma.evaluationSession.create).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid scale config", async () => {
    await expect(
      createAdhocEvaluation(
        {
          title: "Test",
          type: "SCORECARD",
          criteria: [
            {
              title: "Bad",
              fieldType: "SELECTION_SCALE",
              weight: 1,
              sortOrder: 0,
              isRequired: true,
            },
          ],
        },
        "user-1",
      ),
    ).rejects.toThrow(AdhocEvaluationServiceError);
  });
});

describe("listAdhocEvaluations", () => {
  it("returns ad-hoc evaluations for a user", async () => {
    const now = new Date();
    mockPrisma.evaluationSession.findMany.mockResolvedValue([
      {
        id: "s1",
        title: "Eval 1",
        description: null,
        type: "SCORECARD",
        mode: "AD_HOC",
        status: "DRAFT",
        dueDate: null,
        createdAt: now,
        updatedAt: now,
        _count: { criteria: 2, evaluators: 1, ideas: 3, responses: 0 },
      },
    ]);

    const result = await listAdhocEvaluations({ limit: 20 }, "user-1");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.mode).toBe("AD_HOC");
  });
});

describe("getAdhocEvaluationById", () => {
  it("throws for non-existent session", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue(null);

    await expect(getAdhocEvaluationById("nope")).rejects.toThrow("not found");
  });

  it("throws for non-adhoc session", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "STANDARD",
      criteria: [],
      evaluators: [],
      ideas: [],
      _count: { responses: 0 },
    });

    await expect(getAdhocEvaluationById("s1")).rejects.toThrow("not an ad-hoc");
  });
});

describe("deleteAdhocEvaluation", () => {
  it("prevents deleting active sessions", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "ACTIVE",
      mode: "AD_HOC",
      title: "Test",
    });

    await expect(deleteAdhocEvaluation("s1", "user-1")).rejects.toThrow("Cannot delete an active");
  });

  it("prevents deleting non-adhoc sessions", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "DRAFT",
      mode: "STANDARD",
      title: "Test",
    });

    await expect(deleteAdhocEvaluation("s1", "user-1")).rejects.toThrow("not an ad-hoc");
  });
});

describe("activateAdhocEvaluation", () => {
  it("rejects if no criteria", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "AD_HOC",
      status: "DRAFT",
      _count: { criteria: 0, evaluators: 1, ideas: 1 },
    });

    await expect(activateAdhocEvaluation("s1", "user-1")).rejects.toThrow("at least one criterion");
  });

  it("rejects if no evaluators", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "AD_HOC",
      status: "DRAFT",
      _count: { criteria: 1, evaluators: 0, ideas: 1 },
    });

    await expect(activateAdhocEvaluation("s1", "user-1")).rejects.toThrow("at least one evaluator");
  });
});

describe("completeAdhocEvaluation", () => {
  it("rejects non-active sessions", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "DRAFT",
      mode: "AD_HOC",
    });

    await expect(completeAdhocEvaluation("s1", "user-1")).rejects.toThrow("Only active sessions");
  });
});

describe("addItemsToAdhocEvaluation", () => {
  it("adds ad-hoc items to session", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      status: "DRAFT",
      mode: "AD_HOC",
    });

    mockPrisma.evaluationSessionIdea.findMany.mockResolvedValue([]);

    const createdItems = [
      { id: "item-1", adHocTitle: "Item 1", sortOrder: 0 },
      { id: "item-2", adHocTitle: "Item 2", sortOrder: 1 },
    ];
    mockPrisma.$transaction.mockResolvedValue(createdItems);

    const result = await addItemsToAdhocEvaluation(
      {
        sessionId: "s1",
        items: [
          { title: "Item 1", description: "Desc 1" },
          { title: "Item 2", description: "Desc 2" },
        ],
      },
      "user-1",
    );

    expect(result.added).toBe(2);
  });
});

describe("createOneTeamEvaluation", () => {
  it("creates a one-team collaborative session", async () => {
    const now = new Date();
    mockPrisma.evaluationSession.create.mockResolvedValue({
      id: "s1",
      title: "Team Eval",
      description: null,
      type: "SCORECARD",
      mode: "ONE_TEAM",
      status: "DRAFT",
      isCollaborative: true,
      facilitatorId: "user-1",
      consensusRequired: true,
      createdAt: now,
      updatedAt: now,
      criteria: [],
      _count: { evaluators: 2, ideas: 0, responses: 0 },
    });

    const result = await createOneTeamEvaluation(
      {
        title: "Team Eval",
        criteria: [
          {
            title: "Impact",
            fieldType: "SELECTION_SCALE",
            scaleMin: 1,
            scaleMax: 5,
            weight: 1,
            sortOrder: 0,
            isRequired: true,
          },
        ],
        evaluatorIds: ["user-2", "user-3"],
        consensusRequired: true,
      },
      "user-1",
    );

    expect(result.mode).toBe("ONE_TEAM");
    expect(result.isCollaborative).toBe(true);
    expect(result.consensusRequired).toBe(true);
  });
});

describe("startOneTeamSession", () => {
  it("rejects non-one-team sessions", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "AD_HOC",
      status: "ACTIVE",
      liveSessionStarted: null,
    });

    await expect(startOneTeamSession("s1", "user-1")).rejects.toThrow("not a one-team");
  });

  it("rejects if session already started", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "ONE_TEAM",
      status: "ACTIVE",
      liveSessionStarted: new Date(),
      liveSessionEnded: null,
    });

    await expect(startOneTeamSession("s1", "user-1")).rejects.toThrow("already in progress");
  });
});

describe("endOneTeamSession", () => {
  it("rejects if no session in progress", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "ONE_TEAM",
      liveSessionStarted: null,
      liveSessionEnded: null,
    });

    await expect(endOneTeamSession("s1", "user-1")).rejects.toThrow("No live session");
  });
});

describe("createConsensusNote", () => {
  it("rejects notes for non-one-team sessions", async () => {
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "AD_HOC",
      status: "ACTIVE",
    });

    await expect(
      createConsensusNote({ sessionId: "s1", ideaId: "i1", content: "Note" }, "user-1"),
    ).rejects.toThrow("not a one-team");
  });

  it("creates a note for one-team session", async () => {
    const now = new Date();
    mockPrisma.evaluationSession.findUnique.mockResolvedValue({
      id: "s1",
      mode: "ONE_TEAM",
      status: "ACTIVE",
    });
    mockPrisma.consensusNote.create.mockResolvedValue({
      id: "note-1",
      sessionId: "s1",
      ideaId: "i1",
      authorId: "user-1",
      content: "Great idea",
      createdAt: now,
      updatedAt: now,
    });

    const result = await createConsensusNote(
      { sessionId: "s1", ideaId: "i1", content: "Great idea" },
      "user-1",
    );

    expect(result.id).toBe("note-1");
    expect(result.content).toBe("Great idea");
  });
});

describe("listConsensusNotes", () => {
  it("returns notes for a session and idea", async () => {
    const now = new Date();
    mockPrisma.consensusNote.findMany.mockResolvedValue([
      {
        id: "note-1",
        sessionId: "s1",
        ideaId: "i1",
        authorId: "user-1",
        content: "Looks good",
        createdAt: now,
      },
    ]);

    const result = await listConsensusNotes({ sessionId: "s1", ideaId: "i1" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.content).toBe("Looks good");
  });
});
