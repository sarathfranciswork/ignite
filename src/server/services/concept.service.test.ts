import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  listConcepts,
  getConceptById,
  createConcept,
  updateConcept,
  deleteConcept,
  transitionConcept,
  submitConceptDecision,
  addConceptTeamMember,
  removeConceptTeamMember,
  convertConceptToProject,
  ConceptServiceError,
} from "./concept.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    concept: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    conceptTeamMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    conceptDecision: {
      create: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    processDefinition: {
      findUnique: vi.fn(),
    },
    project: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const conceptFindUnique = prisma.concept.findUnique as unknown as Mock;
const conceptFindMany = prisma.concept.findMany as unknown as Mock;
const conceptCreate = prisma.concept.create as unknown as Mock;
const conceptUpdate = prisma.concept.update as unknown as Mock;
const conceptDelete = prisma.concept.delete as unknown as Mock;
const teamMemberFindUnique = prisma.conceptTeamMember.findUnique as unknown as Mock;
const teamMemberCreate = prisma.conceptTeamMember.create as unknown as Mock;
const teamMemberDelete = prisma.conceptTeamMember.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const pdFindUnique = prisma.processDefinition.findUnique as unknown as Mock;
const projectCreate = prisma.project.create as unknown as Mock;
const $transaction = prisma.$transaction as unknown as Mock;

const mockConcept = {
  id: "concept-1",
  title: "Smart Grid Concept",
  description: "A smart grid proposal",
  status: "ELABORATION",
  ownerId: "user-1",
  sourceIdeaId: null,
  problemStatement: null,
  proposedSolution: null,
  valueProposition: null,
  swotStrengths: null,
  swotWeaknesses: null,
  swotOpportunities: null,
  swotThreats: null,
  targetMarket: null,
  resourceRequirements: null,
  expectedRoi: null,
  riskAssessment: null,
  createdById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockConceptDetail = {
  ...mockConcept,
  owner: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
  createdBy: { id: "user-1", name: "Alice", email: "alice@test.com" },
  sourceIdea: null,
  convertedProject: null,
  teamMembers: [
    {
      id: "tm-1",
      role: "OWNER",
      user: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
      createdAt: new Date("2026-01-01"),
    },
  ],
  decisions: [],
};

const mockConceptListItem = {
  ...mockConcept,
  owner: { id: "user-1", name: "Alice", email: "alice@test.com", image: null },
  createdBy: { id: "user-1", name: "Alice", email: "alice@test.com" },
  sourceIdea: null,
  convertedProject: null,
  _count: { teamMembers: 1, decisions: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("concept.service", () => {
  describe("listConcepts", () => {
    it("returns paginated concept list", async () => {
      conceptFindMany.mockResolvedValue([mockConceptListItem]);

      const result = await listConcepts({ limit: 20, sortBy: "updatedAt", sortDirection: "desc" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe("concept-1");
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by status", async () => {
      conceptFindMany.mockResolvedValue([]);

      await listConcepts({
        limit: 20,
        sortBy: "updatedAt",
        sortDirection: "desc",
        status: "APPROVED",
      });

      expect(conceptFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "APPROVED" }),
        }),
      );
    });

    it("returns nextCursor when more items exist", async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        ...mockConceptListItem,
        id: `concept-${i}`,
      }));
      conceptFindMany.mockResolvedValue(items);

      const result = await listConcepts({ limit: 20, sortBy: "updatedAt", sortDirection: "desc" });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("concept-20");
    });
  });

  describe("getConceptById", () => {
    it("returns concept detail", async () => {
      conceptFindUnique.mockResolvedValue(mockConceptDetail);

      const result = await getConceptById("concept-1");

      expect(result.id).toBe("concept-1");
      expect(result.title).toBe("Smart Grid Concept");
    });

    it("throws when concept not found", async () => {
      conceptFindUnique.mockResolvedValue(null);

      await expect(getConceptById("missing")).rejects.toThrow(ConceptServiceError);
    });
  });

  describe("createConcept", () => {
    it("creates a concept and emits event", async () => {
      conceptCreate.mockResolvedValue({ id: "concept-new" });
      conceptFindUnique.mockResolvedValue(mockConceptDetail);

      const result = await createConcept({ title: "New Concept" }, "user-1");

      expect(result.id).toBe("concept-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.created",
        expect.objectContaining({ entity: "Concept" }),
      );
    });

    it("throws when source idea not found", async () => {
      ideaFindUnique.mockResolvedValue(null);

      await expect(
        createConcept({ title: "Test", sourceIdeaId: "idea-missing" }, "user-1"),
      ).rejects.toThrow(ConceptServiceError);
    });
  });

  describe("updateConcept", () => {
    it("updates concept fields", async () => {
      conceptFindUnique.mockResolvedValueOnce(mockConcept).mockResolvedValueOnce(mockConceptDetail);
      conceptUpdate.mockResolvedValue(mockConcept);

      const result = await updateConcept(
        { id: "concept-1", problemStatement: "Energy waste" },
        "user-1",
      );

      expect(result.id).toBe("concept-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.updated",
        expect.objectContaining({ entityId: "concept-1" }),
      );
    });

    it("throws when concept is in terminal status", async () => {
      conceptFindUnique.mockResolvedValue({ ...mockConcept, status: "APPROVED" });

      await expect(updateConcept({ id: "concept-1", title: "Updated" }, "user-1")).rejects.toThrow(
        "Cannot update a concept that has been approved or rejected",
      );
    });
  });

  describe("deleteConcept", () => {
    it("deletes concept and emits event", async () => {
      conceptFindUnique.mockResolvedValue(mockConcept);
      conceptDelete.mockResolvedValue(mockConcept);

      const result = await deleteConcept("concept-1", "user-1");

      expect(result.id).toBe("concept-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.deleted",
        expect.objectContaining({ entityId: "concept-1" }),
      );
    });

    it("throws when concept not found", async () => {
      conceptFindUnique.mockResolvedValue(null);

      await expect(deleteConcept("missing", "user-1")).rejects.toThrow(ConceptServiceError);
    });
  });

  describe("transitionConcept", () => {
    it("transitions from ELABORATION to EVALUATION when guards pass", async () => {
      const conceptWithBizCase = {
        ...mockConcept,
        problemStatement: "The problem",
        proposedSolution: "The solution",
      };
      conceptFindUnique
        .mockResolvedValueOnce(conceptWithBizCase)
        .mockResolvedValueOnce({ ...mockConceptDetail, status: "EVALUATION" });
      conceptUpdate.mockResolvedValue({ ...mockConcept, status: "EVALUATION" });

      const result = await transitionConcept(
        { id: "concept-1", targetStatus: "EVALUATION" },
        "user-1",
      );

      expect(result.status).toBe("EVALUATION");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.statusChanged",
        expect.objectContaining({
          metadata: expect.objectContaining({
            fromStatus: "ELABORATION",
            toStatus: "EVALUATION",
          }),
        }),
      );
    });

    it("throws when guard fails (no problem statement)", async () => {
      conceptFindUnique.mockResolvedValue(mockConcept);

      await expect(
        transitionConcept({ id: "concept-1", targetStatus: "EVALUATION" }, "user-1"),
      ).rejects.toThrow("problem statement must be provided");
    });

    it("throws on invalid transition", async () => {
      conceptFindUnique.mockResolvedValue(mockConcept);

      await expect(
        transitionConcept({ id: "concept-1", targetStatus: "APPROVED" }, "user-1"),
      ).rejects.toThrow("Cannot transition");
    });
  });

  describe("submitConceptDecision", () => {
    it("approves concept in EVALUATION phase", async () => {
      const evaluationConcept = { ...mockConcept, status: "EVALUATION" };
      conceptFindUnique
        .mockResolvedValueOnce(evaluationConcept)
        .mockResolvedValueOnce({ ...mockConceptDetail, status: "APPROVED" });
      $transaction.mockResolvedValue([{}, {}]);

      const result = await submitConceptDecision(
        { conceptId: "concept-1", decision: "APPROVE", feedback: "Great work" },
        "user-1",
      );

      expect(result.status).toBe("APPROVED");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.approved",
        expect.objectContaining({ entityId: "concept-1" }),
      );
    });

    it("rejects concept in EVALUATION phase", async () => {
      const evaluationConcept = { ...mockConcept, status: "EVALUATION" };
      conceptFindUnique
        .mockResolvedValueOnce(evaluationConcept)
        .mockResolvedValueOnce({ ...mockConceptDetail, status: "REJECTED" });
      $transaction.mockResolvedValue([{}, {}]);

      const result = await submitConceptDecision(
        { conceptId: "concept-1", decision: "REJECT" },
        "user-1",
      );

      expect(result.status).toBe("REJECTED");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.rejected",
        expect.objectContaining({ entityId: "concept-1" }),
      );
    });

    it("revises concept back to ELABORATION", async () => {
      const evaluationConcept = { ...mockConcept, status: "EVALUATION" };
      conceptFindUnique
        .mockResolvedValueOnce(evaluationConcept)
        .mockResolvedValueOnce({ ...mockConceptDetail, status: "ELABORATION" });
      $transaction.mockResolvedValue([{}, {}]);

      const result = await submitConceptDecision(
        { conceptId: "concept-1", decision: "REVISE", feedback: "Needs more detail" },
        "user-1",
      );

      expect(result.status).toBe("ELABORATION");
    });

    it("throws when concept not in EVALUATION", async () => {
      conceptFindUnique.mockResolvedValue(mockConcept);

      await expect(
        submitConceptDecision({ conceptId: "concept-1", decision: "APPROVE" }, "user-1"),
      ).rejects.toThrow("Decisions can only be submitted when the concept is in Evaluation");
    });
  });

  describe("addConceptTeamMember", () => {
    it("adds a team member", async () => {
      conceptFindUnique.mockResolvedValueOnce(mockConcept).mockResolvedValueOnce(mockConceptDetail);
      userFindUnique.mockResolvedValue({ id: "user-2", name: "Bob" });
      teamMemberFindUnique.mockResolvedValue(null);
      teamMemberCreate.mockResolvedValue({ id: "tm-2" });

      const result = await addConceptTeamMember(
        { conceptId: "concept-1", userId: "user-2", role: "CONTRIBUTOR" },
        "user-1",
      );

      expect(result.id).toBe("concept-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.teamMemberAdded",
        expect.objectContaining({ entityId: "concept-1" }),
      );
    });

    it("throws when member already exists", async () => {
      conceptFindUnique.mockResolvedValue(mockConcept);
      userFindUnique.mockResolvedValue({ id: "user-2" });
      teamMemberFindUnique.mockResolvedValue({ id: "tm-existing" });

      await expect(
        addConceptTeamMember(
          { conceptId: "concept-1", userId: "user-2", role: "CONTRIBUTOR" },
          "user-1",
        ),
      ).rejects.toThrow("already a team member");
    });
  });

  describe("removeConceptTeamMember", () => {
    it("removes a team member", async () => {
      conceptFindUnique.mockResolvedValueOnce(mockConcept).mockResolvedValueOnce(mockConceptDetail);
      teamMemberFindUnique.mockResolvedValue({ id: "tm-2" });
      teamMemberDelete.mockResolvedValue({ id: "tm-2" });

      const result = await removeConceptTeamMember(
        { conceptId: "concept-1", userId: "user-2" },
        "user-1",
      );

      expect(result.id).toBe("concept-1");
    });

    it("throws when trying to remove owner", async () => {
      conceptFindUnique.mockResolvedValue(mockConcept);

      await expect(
        removeConceptTeamMember({ conceptId: "concept-1", userId: "user-1" }, "user-1"),
      ).rejects.toThrow("Cannot remove the concept owner");
    });
  });

  describe("convertConceptToProject", () => {
    it("converts an approved concept to a project", async () => {
      const approvedConcept = {
        ...mockConcept,
        status: "APPROVED",
        convertedProject: null,
        sourceIdea: null,
      };
      conceptFindUnique.mockResolvedValueOnce(approvedConcept).mockResolvedValueOnce({
        ...mockConceptDetail,
        status: "APPROVED",
        convertedProject: { id: "proj-1", title: "Smart Grid", status: "ACTIVE" },
      });
      pdFindUnique.mockResolvedValue({
        id: "pd-1",
        phases: [{ id: "phase-1", position: 0 }],
      });
      projectCreate.mockResolvedValue({ id: "proj-1" });

      const result = await convertConceptToProject(
        { conceptId: "concept-1", processDefinitionId: "pd-1" },
        "user-1",
      );

      expect(result.projectId).toBe("proj-1");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "concept.convertedToProject",
        expect.objectContaining({
          metadata: expect.objectContaining({ projectId: "proj-1" }),
        }),
      );
    });

    it("throws when concept not approved", async () => {
      conceptFindUnique.mockResolvedValue({
        ...mockConcept,
        convertedProject: null,
        sourceIdea: null,
      });

      await expect(
        convertConceptToProject({ conceptId: "concept-1", processDefinitionId: "pd-1" }, "user-1"),
      ).rejects.toThrow("Only approved concepts");
    });

    it("throws when already converted", async () => {
      conceptFindUnique.mockResolvedValue({
        ...mockConcept,
        status: "APPROVED",
        convertedProject: { id: "proj-existing" },
        sourceIdea: null,
      });

      await expect(
        convertConceptToProject({ conceptId: "concept-1", processDefinitionId: "pd-1" }, "user-1"),
      ).rejects.toThrow("already been converted");
    });
  });
});
