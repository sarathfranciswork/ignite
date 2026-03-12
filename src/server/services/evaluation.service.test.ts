import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listEvaluationSessions,
  getEvaluationSessionById,
  createEvaluationSession,
  updateEvaluationSession,
  deleteEvaluationSession,
  activateEvaluationSession,
  completeEvaluationSession,
  assignEvaluators,
  removeEvaluator,
  addIdeasToSession,
  removeIdeaFromSession,
  submitResponse,
  getEvaluationProgress,
  getEvaluationResults,
  saveSessionAsTemplate,
  listTemplates,
  getMyPendingEvaluations,
  getMyResponses,
  sendReminders,
  EvaluationServiceError,
} from "./evaluation.service";

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
    evaluationSessionEvaluator: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
    },
    evaluationSessionIdea: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
    },
    evaluationResponse: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      groupBy: vi.fn(),
    },
    campaign: {
      findUnique: vi.fn(),
    },
    idea: {
      findMany: vi.fn(),
    },
    bucket: {
      findUnique: vi.fn(),
    },
    ideaBucketAssignment: {
      findMany: vi.fn(),
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

const mockSession = {
  id: "session_1",
  campaignId: "campaign_1",
  title: "Q1 Evaluation",
  description: "Quarterly evaluation",
  type: "SCORECARD" as const,
  status: "DRAFT" as const,
  dueDate: new Date("2026-04-01"),
  isTemplate: false,
  templateId: null,
  createdById: "user_1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockCriterion = {
  id: "criterion_1",
  sessionId: "session_1",
  title: "Innovation",
  description: "How innovative is this idea?",
  guidanceText: "Rate on a scale of 1-5",
  fieldType: "SELECTION_SCALE" as const,
  weight: 2.0,
  sortOrder: 0,
  isRequired: true,
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: { "1": "Poor", "5": "Excellent" },
  visibleWhen: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("evaluation.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listEvaluationSessions", () => {
    it("lists sessions for a campaign", async () => {
      vi.mocked(prisma.evaluationSession.findMany).mockResolvedValue([
        {
          ...mockSession,
          _count: { criteria: 2, evaluators: 3, ideas: 5, responses: 10 },
        },
      ] as never);

      const result = await listEvaluationSessions({
        campaignId: "campaign_1",
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Q1 Evaluation");
      expect(result.items[0].criteriaCount).toBe(2);
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by status", async () => {
      vi.mocked(prisma.evaluationSession.findMany).mockResolvedValue([]);

      await listEvaluationSessions({
        campaignId: "campaign_1",
        limit: 20,
        status: "ACTIVE",
      });

      expect(prisma.evaluationSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "ACTIVE" }),
        }),
      );
    });
  });

  describe("getEvaluationSessionById", () => {
    it("returns session with all relations", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        criteria: [mockCriterion],
        evaluators: [{ id: "ev_1", userId: "user_2", assignedAt: new Date() }],
        ideas: [
          {
            id: "si_1",
            ideaId: "idea_1",
            sortOrder: 0,
            idea: { id: "idea_1", title: "My Idea", teaser: "A great idea", status: "DRAFT" },
          },
        ],
        _count: { responses: 5 },
      } as never);

      const result = await getEvaluationSessionById("session_1");

      expect(result.title).toBe("Q1 Evaluation");
      expect(result.criteria).toHaveLength(1);
      expect(result.evaluators).toHaveLength(1);
      expect(result.ideas).toHaveLength(1);
    });

    it("throws SESSION_NOT_FOUND for missing session", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue(null);

      await expect(getEvaluationSessionById("missing")).rejects.toThrow(EvaluationServiceError);
    });
  });

  describe("createEvaluationSession", () => {
    it("creates a scorecard session with criteria", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "campaign_1" } as never);
      vi.mocked(prisma.evaluationSession.create).mockResolvedValue({
        ...mockSession,
        criteria: [mockCriterion],
        _count: { evaluators: 0, ideas: 0, responses: 0 },
      } as never);

      const result = await createEvaluationSession(
        {
          campaignId: "campaign_1",
          title: "Q1 Evaluation",
          type: "SCORECARD",
          isTemplate: false,
          criteria: [
            {
              title: "Innovation",
              fieldType: "SELECTION_SCALE",
              weight: 2.0,
              sortOrder: 0,
              isRequired: true,
              scaleMin: 1,
              scaleMax: 5,
            },
          ],
        },
        "user_1",
      );

      expect(result.title).toBe("Q1 Evaluation");
      expect(result.type).toBe("SCORECARD");
    });

    it("rejects missing campaign", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);

      await expect(
        createEvaluationSession(
          {
            campaignId: "missing",
            title: "Test",
            type: "SCORECARD",
            isTemplate: false,
            criteria: [
              { title: "X", fieldType: "TEXT", weight: 1, sortOrder: 0, isRequired: true },
            ],
          },
          "user_1",
        ),
      ).rejects.toThrow("Campaign not found");
    });

    it("validates scale config for SELECTION_SCALE criteria", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "campaign_1" } as never);

      await expect(
        createEvaluationSession(
          {
            campaignId: "campaign_1",
            title: "Test",
            type: "SCORECARD",
            isTemplate: false,
            criteria: [
              {
                title: "Innovation",
                fieldType: "SELECTION_SCALE",
                weight: 1,
                sortOrder: 0,
                isRequired: true,
              },
            ],
          },
          "user_1",
        ),
      ).rejects.toThrow("scaleMin and scaleMax");
    });

    it("rejects scaleMin >= scaleMax", async () => {
      vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "campaign_1" } as never);

      await expect(
        createEvaluationSession(
          {
            campaignId: "campaign_1",
            title: "Test",
            type: "SCORECARD",
            isTemplate: false,
            criteria: [
              {
                title: "Innovation",
                fieldType: "SELECTION_SCALE",
                weight: 1,
                sortOrder: 0,
                isRequired: true,
                scaleMin: 5,
                scaleMax: 3,
              },
            ],
          },
          "user_1",
        ),
      ).rejects.toThrow("scaleMin must be less than scaleMax");
    });
  });

  describe("updateEvaluationSession", () => {
    it("updates a draft session", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSession.update).mockResolvedValue({
        ...mockSession,
        title: "Updated Title",
        _count: { criteria: 1, evaluators: 0, ideas: 0, responses: 0 },
      } as never);

      const result = await updateEvaluationSession(
        { id: "session_1", title: "Updated Title" },
        "user_1",
      );

      expect(result.title).toBe("Updated Title");
    });

    it("rejects update for non-draft sessions", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "ACTIVE",
        campaignId: "campaign_1",
      } as never);

      await expect(
        updateEvaluationSession({ id: "session_1", title: "Updated" }, "user_1"),
      ).rejects.toThrow("Only draft sessions can be updated");
    });
  });

  describe("deleteEvaluationSession", () => {
    it("deletes a draft session", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
        title: "Test",
      } as never);
      vi.mocked(prisma.evaluationSession.delete).mockResolvedValue(mockSession as never);

      const result = await deleteEvaluationSession("session_1", "user_1");
      expect(result.success).toBe(true);
    });

    it("rejects deleting active sessions", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "ACTIVE",
        campaignId: "campaign_1",
        title: "Test",
      } as never);

      await expect(deleteEvaluationSession("session_1", "user_1")).rejects.toThrow(
        "Cannot delete an active session",
      );
    });
  });

  describe("activateEvaluationSession", () => {
    it("activates a draft session with criteria, evaluators, and ideas", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        _count: { criteria: 2, evaluators: 1, ideas: 3 },
      } as never);

      vi.mocked(prisma.evaluationSession.update).mockResolvedValue({
        ...mockSession,
        status: "ACTIVE",
      } as never);

      const result = await activateEvaluationSession("session_1", "user_1");
      expect(result.status).toBe("ACTIVE");
    });

    it("rejects activation without evaluators", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        _count: { criteria: 2, evaluators: 0, ideas: 3 },
      } as never);

      await expect(activateEvaluationSession("session_1", "user_1")).rejects.toThrow(
        "at least one evaluator",
      );
    });

    it("rejects activation without ideas", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        _count: { criteria: 2, evaluators: 1, ideas: 0 },
      } as never);

      await expect(activateEvaluationSession("session_1", "user_1")).rejects.toThrow(
        "at least one idea",
      );
    });
  });

  describe("completeEvaluationSession", () => {
    it("completes an active session", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "ACTIVE",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSession.update).mockResolvedValue({
        ...mockSession,
        status: "COMPLETED",
      } as never);

      const result = await completeEvaluationSession("session_1", "user_1");
      expect(result.status).toBe("COMPLETED");
    });

    it("rejects completing non-active sessions", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      await expect(completeEvaluationSession("session_1", "user_1")).rejects.toThrow(
        "Only active sessions can be completed",
      );
    });
  });

  describe("assignEvaluators", () => {
    it("assigns new evaluators", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([]);
      vi.mocked(prisma.evaluationSessionEvaluator.createMany).mockResolvedValue({
        count: 2,
      } as never);

      const result = await assignEvaluators(
        { sessionId: "session_1", userIds: ["user_2", "user_3"] },
        "user_1",
      );

      expect(result.added).toBe(2);
    });

    it("skips already-assigned evaluators", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([
        { userId: "user_2" },
      ] as never);

      vi.mocked(prisma.evaluationSessionEvaluator.createMany).mockResolvedValue({
        count: 1,
      } as never);

      const result = await assignEvaluators(
        { sessionId: "session_1", userIds: ["user_2", "user_3"] },
        "user_1",
      );

      expect(result.added).toBe(1);
    });

    it("rejects assigning to completed sessions", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "COMPLETED",
        campaignId: "campaign_1",
      } as never);

      await expect(
        assignEvaluators({ sessionId: "session_1", userIds: ["user_2"] }, "user_1"),
      ).rejects.toThrow("completed or archived");
    });
  });

  describe("removeEvaluator", () => {
    it("removes evaluator and their responses", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSessionEvaluator.findUnique).mockResolvedValue({
        id: "ev_1",
        sessionId: "session_1",
        userId: "user_2",
      } as never);

      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      const result = await removeEvaluator({ sessionId: "session_1", userId: "user_2" }, "user_1");

      expect(result.success).toBe(true);
    });
  });

  describe("addIdeasToSession", () => {
    it("adds ideas to a session", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.idea.findMany).mockResolvedValue([
        { id: "idea_1" },
        { id: "idea_2" },
      ] as never);

      vi.mocked(prisma.evaluationSessionIdea.findMany).mockResolvedValue([]);
      vi.mocked(prisma.evaluationSessionIdea.createMany).mockResolvedValue({
        count: 2,
      } as never);

      const result = await addIdeasToSession(
        { sessionId: "session_1", ideaIds: ["idea_1", "idea_2"] },
        "user_1",
      );

      expect(result.added).toBe(2);
    });

    it("rejects ideas not in the campaign", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.idea.findMany).mockResolvedValue([{ id: "idea_1" }] as never);

      await expect(
        addIdeasToSession(
          { sessionId: "session_1", ideaIds: ["idea_1", "idea_missing"] },
          "user_1",
        ),
      ).rejects.toThrow("not found or not in this campaign");
    });
  });

  describe("removeIdeaFromSession", () => {
    it("removes idea and its responses", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSessionIdea.findUnique).mockResolvedValue({
        id: "si_1",
        sessionId: "session_1",
        ideaId: "idea_1",
      } as never);

      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      const result = await removeIdeaFromSession(
        { sessionId: "session_1", ideaId: "idea_1" },
        "user_1",
      );

      expect(result.success).toBe(true);
    });
  });

  describe("submitResponse", () => {
    it("submits evaluation responses", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "ACTIVE",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSessionEvaluator.findUnique).mockResolvedValue({
        id: "ev_1",
        sessionId: "session_1",
        userId: "user_2",
      } as never);

      vi.mocked(prisma.evaluationSessionIdea.findUnique).mockResolvedValue({
        id: "si_1",
        sessionId: "session_1",
        ideaId: "idea_1",
      } as never);

      vi.mocked(prisma.evaluationResponse.upsert).mockResolvedValue({} as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([]);

      const result = await submitResponse(
        {
          sessionId: "session_1",
          ideaId: "idea_1",
          responses: [
            { criterionId: "criterion_1", scoreValue: 4 },
            { criterionId: "criterion_2", textValue: "Good idea" },
          ],
        },
        "user_2",
      );

      expect(result.saved).toBe(2);
    });

    it("rejects responses to non-active sessions", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "DRAFT",
        campaignId: "campaign_1",
      } as never);

      await expect(
        submitResponse(
          {
            sessionId: "session_1",
            ideaId: "idea_1",
            responses: [{ criterionId: "c_1", scoreValue: 3 }],
          },
          "user_2",
        ),
      ).rejects.toThrow("only be submitted to active sessions");
    });

    it("rejects responses from non-evaluators", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "ACTIVE",
        campaignId: "campaign_1",
      } as never);

      vi.mocked(prisma.evaluationSessionEvaluator.findUnique).mockResolvedValue(null);

      await expect(
        submitResponse(
          {
            sessionId: "session_1",
            ideaId: "idea_1",
            responses: [{ criterionId: "c_1", scoreValue: 3 }],
          },
          "user_not_evaluator",
        ),
      ).rejects.toThrow("not an evaluator");
    });
  });

  describe("getEvaluationProgress", () => {
    it("calculates progress per evaluator", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        evaluators: [{ userId: "user_2" }, { userId: "user_3" }],
        ideas: [{ ideaId: "idea_1" }, { ideaId: "idea_2" }],
        criteria: [{ id: "c_1" }, { id: "c_2" }],
      } as never);

      vi.mocked(prisma.evaluationResponse.groupBy).mockResolvedValue([
        { evaluatorId: "user_2", _count: { id: 4 } },
        { evaluatorId: "user_3", _count: { id: 2 } },
      ] as never);

      const result = await getEvaluationProgress({ sessionId: "session_1" });

      expect(result.evaluatorProgress).toHaveLength(2);
      expect(result.evaluatorProgress[0].userId).toBe("user_2");
      expect(result.evaluatorProgress[0].percentage).toBe(100); // 4 / (2 ideas * 2 criteria)
      expect(result.evaluatorProgress[1].percentage).toBe(50); // 2 / 4
      expect(result.overall.percentage).toBe(75); // 6 / 8
    });
  });

  describe("getEvaluationResults", () => {
    it("calculates weighted scores and rankings", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        criteria: [
          { ...mockCriterion, id: "c_1", weight: 2.0 },
          { ...mockCriterion, id: "c_2", title: "Feasibility", weight: 1.0 },
        ],
        ideas: [
          {
            ideaId: "idea_1",
            idea: { id: "idea_1", title: "Idea A", teaser: "Teaser A", status: "DRAFT" },
          },
          {
            ideaId: "idea_2",
            idea: { id: "idea_2", title: "Idea B", teaser: "Teaser B", status: "DRAFT" },
          },
        ],
      } as never);

      vi.mocked(prisma.evaluationResponse.findMany).mockResolvedValue([
        { ideaId: "idea_1", criterionId: "c_1", scoreValue: 4, evaluatorId: "u1" },
        { ideaId: "idea_1", criterionId: "c_1", scoreValue: 5, evaluatorId: "u2" },
        { ideaId: "idea_1", criterionId: "c_2", scoreValue: 3, evaluatorId: "u1" },
        { ideaId: "idea_1", criterionId: "c_2", scoreValue: 4, evaluatorId: "u2" },
        { ideaId: "idea_2", criterionId: "c_1", scoreValue: 3, evaluatorId: "u1" },
        { ideaId: "idea_2", criterionId: "c_1", scoreValue: 3, evaluatorId: "u2" },
        { ideaId: "idea_2", criterionId: "c_2", scoreValue: 5, evaluatorId: "u1" },
        { ideaId: "idea_2", criterionId: "c_2", scoreValue: 5, evaluatorId: "u2" },
      ] as never);

      const result = await getEvaluationResults({ sessionId: "session_1" });

      expect(result.results).toHaveLength(2);
      // Idea A: (4.5 * 2/3) + (3.5 * 1/3) = 3.0 + 1.167 = 4.167
      // Idea B: (3.0 * 2/3) + (5.0 * 1/3) = 2.0 + 1.667 = 3.667
      expect(result.results[0].ideaId).toBe("idea_1");
      expect(result.results[0].weightedScore).toBeGreaterThan(result.results[1].weightedScore);
    });
  });

  describe("saveSessionAsTemplate", () => {
    it("saves session as template with criteria", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        criteria: [mockCriterion],
      } as never);

      vi.mocked(prisma.evaluationSession.create).mockResolvedValue({
        ...mockSession,
        id: "template_1",
        title: "Template: Q1",
        isTemplate: true,
        _count: { criteria: 1 },
      } as never);

      const result = await saveSessionAsTemplate(
        { sessionId: "session_1", title: "Template: Q1" },
        "user_1",
      );

      expect(result.isTemplate).toBe(true);
      expect(result.title).toBe("Template: Q1");
    });
  });

  describe("listTemplates", () => {
    it("lists evaluation templates", async () => {
      vi.mocked(prisma.evaluationSession.findMany).mockResolvedValue([
        {
          ...mockSession,
          id: "template_1",
          isTemplate: true,
          _count: { criteria: 3 },
        },
      ] as never);

      const result = await listTemplates({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].criteriaCount).toBe(3);
    });
  });

  describe("getMyPendingEvaluations", () => {
    it("returns empty when user has no assignments", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([]);

      const result = await getMyPendingEvaluations({ limit: 20 }, "user_1");

      expect(result.items).toHaveLength(0);
    });

    it("returns active sessions user is assigned to with progress", async () => {
      vi.mocked(prisma.evaluationSessionEvaluator.findMany).mockResolvedValue([
        { sessionId: "session_1" },
      ] as never);

      vi.mocked(prisma.evaluationSession.findMany).mockResolvedValue([
        {
          ...mockSession,
          status: "ACTIVE",
          campaign: { id: "campaign_1", title: "Test Campaign" },
          criteria: [{ id: "c_1" }],
          ideas: [{ ideaId: "idea_1" }],
          _count: { criteria: 1, ideas: 1, evaluators: 2 },
        },
      ] as never);

      vi.mocked(prisma.evaluationResponse.groupBy).mockResolvedValue([
        { sessionId: "session_1", _count: { id: 1 } },
      ] as never);

      const result = await getMyPendingEvaluations({ limit: 20 }, "user_1");

      expect(result.items).toHaveLength(1);
      expect(result.items[0].campaignTitle).toBe("Test Campaign");
      expect(result.items[0].myProgress.percentage).toBe(100);
    });
  });

  describe("getMyResponses", () => {
    it("returns existing responses for a session and idea", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        id: "session_1",
        status: "ACTIVE",
      } as never);

      vi.mocked(prisma.evaluationSessionEvaluator.findUnique).mockResolvedValue({
        id: "eval_1",
        sessionId: "session_1",
        userId: "user_1",
      } as never);

      vi.mocked(prisma.evaluationResponse.findMany).mockResolvedValue([
        {
          criterionId: "c_1",
          scoreValue: 4,
          textValue: null,
          boolValue: null,
          updatedAt: new Date("2026-03-01"),
        },
      ] as never);

      const result = await getMyResponses({ sessionId: "session_1", ideaId: "idea_1" }, "user_1");

      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].scoreValue).toBe(4);
    });

    it("throws when session not found", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue(null);

      await expect(
        getMyResponses({ sessionId: "nonexistent", ideaId: "idea_1" }, "user_1"),
      ).rejects.toThrow(EvaluationServiceError);
    });
  });

  describe("sendReminders", () => {
    it("identifies incomplete evaluators and emits event", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        status: "ACTIVE",
        evaluators: [{ userId: "user_1" }, { userId: "user_2" }],
        criteria: [{ id: "c_1" }],
        ideas: [{ ideaId: "idea_1" }],
      } as never);

      vi.mocked(prisma.evaluationResponse.groupBy).mockResolvedValue([
        { evaluatorId: "user_1", _count: { id: 1 } },
      ] as never);

      const result = await sendReminders({ sessionId: "session_1" }, "admin_1");

      expect(result.sent).toBe(1);
      expect(result.evaluatorIds).toEqual(["user_2"]);
    });

    it("returns zero when all evaluators are complete", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        status: "ACTIVE",
        evaluators: [{ userId: "user_1" }],
        criteria: [{ id: "c_1" }],
        ideas: [{ ideaId: "idea_1" }],
      } as never);

      vi.mocked(prisma.evaluationResponse.groupBy).mockResolvedValue([
        { evaluatorId: "user_1", _count: { id: 1 } },
      ] as never);

      const result = await sendReminders({ sessionId: "session_1" }, "admin_1");

      expect(result.sent).toBe(0);
      expect(result.evaluatorIds).toEqual([]);
    });

    it("throws when session is not active", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue({
        ...mockSession,
        status: "DRAFT",
        evaluators: [],
        criteria: [],
        ideas: [],
      } as never);

      await expect(sendReminders({ sessionId: "session_1" }, "admin_1")).rejects.toThrow(
        EvaluationServiceError,
      );
    });

    it("throws when session not found", async () => {
      vi.mocked(prisma.evaluationSession.findUnique).mockResolvedValue(null);

      await expect(sendReminders({ sessionId: "nonexistent" }, "admin_1")).rejects.toThrow(
        EvaluationServiceError,
      );
    });
  });
});
