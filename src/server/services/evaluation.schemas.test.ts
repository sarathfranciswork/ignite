import { describe, it, expect } from "vitest";
import {
  evaluationSessionCreateInput,
  evaluationSessionUpdateInput,
  evaluationSessionListInput,
  evaluationAssignEvaluatorsInput,
  evaluationSubmitResponseInput,
  evaluationAddIdeasInput,
  evaluationMyPendingInput,
  evaluationMyResponsesInput,
  evaluationSendRemindersInput,
} from "./evaluation.schemas";

describe("evaluation.schemas", () => {
  describe("evaluationSessionCreateInput", () => {
    it("accepts valid scorecard input", () => {
      const input = {
        campaignId: "campaign_1",
        title: "Q1 Evaluation",
        type: "SCORECARD" as const,
        criteria: [
          {
            title: "Innovation",
            fieldType: "SELECTION_SCALE" as const,
            weight: 2.0,
            sortOrder: 0,
            isRequired: true,
            scaleMin: 1,
            scaleMax: 5,
          },
        ],
      };

      const result = evaluationSessionCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts valid pairwise input", () => {
      const input = {
        campaignId: "campaign_1",
        title: "Pairwise Comparison",
        type: "PAIRWISE" as const,
        criteria: [
          {
            title: "Overall Preference",
            fieldType: "SELECTION_SCALE" as const,
            scaleMin: 1,
            scaleMax: 10,
          },
        ],
      };

      const result = evaluationSessionCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const input = {
        campaignId: "campaign_1",
        title: "",
        type: "SCORECARD" as const,
        criteria: [{ title: "X", fieldType: "TEXT" as const }],
      };

      const result = evaluationSessionCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects empty criteria array", () => {
      const input = {
        campaignId: "campaign_1",
        title: "Test",
        type: "SCORECARD" as const,
        criteria: [],
      };

      const result = evaluationSessionCreateInput.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("accepts criteria with TEXT and CHECKBOX field types", () => {
      const input = {
        campaignId: "campaign_1",
        title: "Mixed Criteria",
        type: "SCORECARD" as const,
        criteria: [
          { title: "Comments", fieldType: "TEXT" as const },
          { title: "Recommended", fieldType: "CHECKBOX" as const },
        ],
      };

      const result = evaluationSessionCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts optional dueDate", () => {
      const input = {
        campaignId: "campaign_1",
        title: "With Due Date",
        type: "SCORECARD" as const,
        dueDate: "2026-04-01T00:00:00.000Z",
        criteria: [{ title: "X", fieldType: "TEXT" as const }],
      };

      const result = evaluationSessionCreateInput.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("evaluationSessionUpdateInput", () => {
    it("accepts partial update", () => {
      const result = evaluationSessionUpdateInput.safeParse({
        id: "session_1",
        title: "Updated Title",
      });

      expect(result.success).toBe(true);
    });

    it("requires session id", () => {
      const result = evaluationSessionUpdateInput.safeParse({
        title: "Missing ID",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("evaluationSessionListInput", () => {
    it("accepts minimal input", () => {
      const result = evaluationSessionListInput.safeParse({
        campaignId: "campaign_1",
      });

      expect(result.success).toBe(true);
    });

    it("accepts all filters", () => {
      const result = evaluationSessionListInput.safeParse({
        campaignId: "campaign_1",
        status: "ACTIVE",
        type: "PAIRWISE",
        isTemplate: false,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("evaluationAssignEvaluatorsInput", () => {
    it("accepts valid input", () => {
      const result = evaluationAssignEvaluatorsInput.safeParse({
        sessionId: "session_1",
        userIds: ["user_1", "user_2"],
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty userIds array", () => {
      const result = evaluationAssignEvaluatorsInput.safeParse({
        sessionId: "session_1",
        userIds: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("evaluationSubmitResponseInput", () => {
    it("accepts score response", () => {
      const result = evaluationSubmitResponseInput.safeParse({
        sessionId: "session_1",
        ideaId: "idea_1",
        responses: [{ criterionId: "c_1", scoreValue: 4 }],
      });

      expect(result.success).toBe(true);
    });

    it("accepts text response", () => {
      const result = evaluationSubmitResponseInput.safeParse({
        sessionId: "session_1",
        ideaId: "idea_1",
        responses: [{ criterionId: "c_1", textValue: "Great idea" }],
      });

      expect(result.success).toBe(true);
    });

    it("accepts checkbox response", () => {
      const result = evaluationSubmitResponseInput.safeParse({
        sessionId: "session_1",
        ideaId: "idea_1",
        responses: [{ criterionId: "c_1", boolValue: true }],
      });

      expect(result.success).toBe(true);
    });
  });

  describe("evaluationAddIdeasInput", () => {
    it("accepts valid input", () => {
      const result = evaluationAddIdeasInput.safeParse({
        sessionId: "session_1",
        ideaIds: ["idea_1", "idea_2"],
      });

      expect(result.success).toBe(true);
    });

    it("rejects empty ideaIds array", () => {
      const result = evaluationAddIdeasInput.safeParse({
        sessionId: "session_1",
        ideaIds: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("evaluationMyPendingInput", () => {
    it("accepts minimal input", () => {
      const result = evaluationMyPendingInput.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts limit and cursor", () => {
      const result = evaluationMyPendingInput.safeParse({
        limit: 10,
        cursor: "cursor_1",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("evaluationMyResponsesInput", () => {
    it("accepts valid input", () => {
      const result = evaluationMyResponsesInput.safeParse({
        sessionId: "session_1",
        ideaId: "idea_1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing sessionId", () => {
      const result = evaluationMyResponsesInput.safeParse({
        ideaId: "idea_1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing ideaId", () => {
      const result = evaluationMyResponsesInput.safeParse({
        sessionId: "session_1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("evaluationSendRemindersInput", () => {
    it("accepts valid input", () => {
      const result = evaluationSendRemindersInput.safeParse({
        sessionId: "session_1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing sessionId", () => {
      const result = evaluationSendRemindersInput.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
