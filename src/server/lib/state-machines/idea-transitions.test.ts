import { describe, it, expect } from "vitest";
import {
  getValidIdeaTransitions,
  isValidIdeaTransition,
  canArchiveIdea,
  canUnarchiveIdea,
  IDEA_STATUS_LABELS,
  IDEA_PHASE_ORDER,
} from "./idea-transitions";

describe("idea-transitions", () => {
  describe("getValidIdeaTransitions", () => {
    const allPhasesEnabled = {
      hasQualificationPhase: true,
      hasDiscussionPhase: true,
    };

    it("returns QUALIFICATION from DRAFT", () => {
      const transitions = getValidIdeaTransitions("DRAFT", allPhasesEnabled);
      expect(transitions).toEqual(["QUALIFICATION"]);
    });

    it("returns COMMUNITY_DISCUSSION and EVALUATION from QUALIFICATION", () => {
      const transitions = getValidIdeaTransitions("QUALIFICATION", allPhasesEnabled);
      expect(transitions).toEqual(["COMMUNITY_DISCUSSION", "EVALUATION"]);
    });

    it("returns only EVALUATION from QUALIFICATION when discussion disabled", () => {
      const transitions = getValidIdeaTransitions("QUALIFICATION", {
        hasQualificationPhase: true,
        hasDiscussionPhase: false,
      });
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("returns HOT and EVALUATION from COMMUNITY_DISCUSSION", () => {
      const transitions = getValidIdeaTransitions("COMMUNITY_DISCUSSION", allPhasesEnabled);
      expect(transitions).toEqual(["HOT", "EVALUATION"]);
    });

    it("returns EVALUATION from HOT", () => {
      const transitions = getValidIdeaTransitions("HOT", allPhasesEnabled);
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("returns SELECTED_IMPLEMENTATION from EVALUATION", () => {
      const transitions = getValidIdeaTransitions("EVALUATION", allPhasesEnabled);
      expect(transitions).toEqual(["SELECTED_IMPLEMENTATION"]);
    });

    it("returns IMPLEMENTED from SELECTED_IMPLEMENTATION", () => {
      const transitions = getValidIdeaTransitions("SELECTED_IMPLEMENTATION", allPhasesEnabled);
      expect(transitions).toEqual(["IMPLEMENTED"]);
    });

    it("returns empty array from IMPLEMENTED", () => {
      const transitions = getValidIdeaTransitions("IMPLEMENTED", allPhasesEnabled);
      expect(transitions).toEqual([]);
    });

    it("returns empty array from ARCHIVED", () => {
      const transitions = getValidIdeaTransitions("ARCHIVED", allPhasesEnabled);
      expect(transitions).toEqual([]);
    });
  });

  describe("campaign phase ceiling", () => {
    const allPhasesEnabled = {
      hasQualificationPhase: true,
      hasDiscussionPhase: true,
    };

    it("restricts transitions based on campaign SUBMISSION phase", () => {
      // From QUALIFICATION during SUBMISSION campaign phase:
      // COMMUNITY_DISCUSSION and EVALUATION are not allowed because
      // campaign ceiling for SUBMISSION only allows DRAFT, QUALIFICATION
      const transitions = getValidIdeaTransitions("QUALIFICATION", allPhasesEnabled, "SUBMISSION");
      expect(transitions).toEqual([]);
    });

    it("allows COMMUNITY_DISCUSSION during DISCUSSION_VOTING campaign phase", () => {
      const transitions = getValidIdeaTransitions(
        "QUALIFICATION",
        allPhasesEnabled,
        "DISCUSSION_VOTING",
      );
      expect(transitions).toContain("COMMUNITY_DISCUSSION");
    });

    it("allows EVALUATION during EVALUATION campaign phase", () => {
      const transitions = getValidIdeaTransitions("HOT", allPhasesEnabled, "EVALUATION");
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("allows all transitions when campaign is CLOSED", () => {
      const transitions = getValidIdeaTransitions("EVALUATION", allPhasesEnabled, "CLOSED");
      expect(transitions).toEqual(["SELECTED_IMPLEMENTATION"]);
    });

    it("does not restrict when no campaign status provided", () => {
      const transitions = getValidIdeaTransitions("QUALIFICATION", allPhasesEnabled);
      expect(transitions).toEqual(["COMMUNITY_DISCUSSION", "EVALUATION"]);
    });
  });

  describe("isValidIdeaTransition", () => {
    const allPhasesEnabled = {
      hasQualificationPhase: true,
      hasDiscussionPhase: true,
    };

    it("allows DRAFT -> QUALIFICATION", () => {
      expect(isValidIdeaTransition("DRAFT", "QUALIFICATION", allPhasesEnabled)).toBe(true);
    });

    it("disallows DRAFT -> EVALUATION (skip)", () => {
      expect(isValidIdeaTransition("DRAFT", "EVALUATION", allPhasesEnabled)).toBe(false);
    });

    it("disallows backward transitions", () => {
      expect(isValidIdeaTransition("COMMUNITY_DISCUSSION", "DRAFT", allPhasesEnabled)).toBe(false);
    });

    it("disallows transitions from ARCHIVED", () => {
      expect(isValidIdeaTransition("ARCHIVED", "DRAFT", allPhasesEnabled)).toBe(false);
    });

    it("respects campaign phase ceiling", () => {
      expect(
        isValidIdeaTransition(
          "QUALIFICATION",
          "COMMUNITY_DISCUSSION",
          allPhasesEnabled,
          "SUBMISSION",
        ),
      ).toBe(false);

      expect(
        isValidIdeaTransition(
          "QUALIFICATION",
          "COMMUNITY_DISCUSSION",
          allPhasesEnabled,
          "DISCUSSION_VOTING",
        ),
      ).toBe(true);
    });
  });

  describe("canArchiveIdea", () => {
    it("allows archiving from DRAFT", () => {
      expect(canArchiveIdea("DRAFT")).toBe(true);
    });

    it("allows archiving from QUALIFICATION", () => {
      expect(canArchiveIdea("QUALIFICATION")).toBe(true);
    });

    it("allows archiving from COMMUNITY_DISCUSSION", () => {
      expect(canArchiveIdea("COMMUNITY_DISCUSSION")).toBe(true);
    });

    it("allows archiving from HOT", () => {
      expect(canArchiveIdea("HOT")).toBe(true);
    });

    it("allows archiving from EVALUATION", () => {
      expect(canArchiveIdea("EVALUATION")).toBe(true);
    });

    it("allows archiving from SELECTED_IMPLEMENTATION", () => {
      expect(canArchiveIdea("SELECTED_IMPLEMENTATION")).toBe(true);
    });

    it("disallows archiving from IMPLEMENTED", () => {
      expect(canArchiveIdea("IMPLEMENTED")).toBe(false);
    });

    it("disallows archiving from ARCHIVED", () => {
      expect(canArchiveIdea("ARCHIVED")).toBe(false);
    });
  });

  describe("canUnarchiveIdea", () => {
    it("allows unarchiving from ARCHIVED", () => {
      expect(canUnarchiveIdea("ARCHIVED")).toBe(true);
    });

    it("disallows unarchiving from non-archived states", () => {
      expect(canUnarchiveIdea("DRAFT")).toBe(false);
      expect(canUnarchiveIdea("QUALIFICATION")).toBe(false);
      expect(canUnarchiveIdea("IMPLEMENTED")).toBe(false);
    });
  });

  describe("IDEA_STATUS_LABELS", () => {
    it("has labels for all statuses", () => {
      expect(IDEA_STATUS_LABELS.DRAFT).toBe("Draft");
      expect(IDEA_STATUS_LABELS.QUALIFICATION).toBe("Qualification");
      expect(IDEA_STATUS_LABELS.COMMUNITY_DISCUSSION).toBe("Community Discussion");
      expect(IDEA_STATUS_LABELS.HOT).toBe("Hot");
      expect(IDEA_STATUS_LABELS.EVALUATION).toBe("Evaluation");
      expect(IDEA_STATUS_LABELS.SELECTED_IMPLEMENTATION).toBe("Selected for Implementation");
      expect(IDEA_STATUS_LABELS.IMPLEMENTED).toBe("Implemented");
      expect(IDEA_STATUS_LABELS.ARCHIVED).toBe("Archived");
    });
  });

  describe("IDEA_PHASE_ORDER", () => {
    it("contains all 8 phases in order", () => {
      expect(IDEA_PHASE_ORDER).toEqual([
        "DRAFT",
        "QUALIFICATION",
        "COMMUNITY_DISCUSSION",
        "HOT",
        "EVALUATION",
        "SELECTED_IMPLEMENTATION",
        "IMPLEMENTED",
        "ARCHIVED",
      ]);
    });
  });
});
