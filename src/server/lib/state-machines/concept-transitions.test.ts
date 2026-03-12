import { describe, it, expect } from "vitest";
import {
  getValidConceptTransitions,
  isValidConceptTransition,
  getConceptTransitionGuards,
  CONCEPT_STATUS_LABELS,
  CONCEPT_PHASE_ORDER,
  CONCEPT_GUARD_FAILURE_MESSAGES,
} from "./concept-transitions";

describe("concept-transitions", () => {
  describe("getValidConceptTransitions", () => {
    it("returns EVALUATION from ELABORATION", () => {
      const transitions = getValidConceptTransitions("ELABORATION");
      expect(transitions).toEqual(["EVALUATION"]);
    });

    it("returns APPROVED, REJECTED, and ELABORATION from EVALUATION", () => {
      const transitions = getValidConceptTransitions("EVALUATION");
      expect(transitions).toEqual(["APPROVED", "REJECTED", "ELABORATION"]);
    });

    it("returns empty array from APPROVED (terminal)", () => {
      const transitions = getValidConceptTransitions("APPROVED");
      expect(transitions).toEqual([]);
    });

    it("returns empty array from REJECTED (terminal)", () => {
      const transitions = getValidConceptTransitions("REJECTED");
      expect(transitions).toEqual([]);
    });
  });

  describe("isValidConceptTransition", () => {
    it("allows ELABORATION -> EVALUATION", () => {
      expect(isValidConceptTransition("ELABORATION", "EVALUATION")).toBe(true);
    });

    it("allows EVALUATION -> APPROVED", () => {
      expect(isValidConceptTransition("EVALUATION", "APPROVED")).toBe(true);
    });

    it("allows EVALUATION -> REJECTED", () => {
      expect(isValidConceptTransition("EVALUATION", "REJECTED")).toBe(true);
    });

    it("allows EVALUATION -> ELABORATION (revise)", () => {
      expect(isValidConceptTransition("EVALUATION", "ELABORATION")).toBe(true);
    });

    it("disallows ELABORATION -> APPROVED (skip evaluation)", () => {
      expect(isValidConceptTransition("ELABORATION", "APPROVED")).toBe(false);
    });

    it("disallows ELABORATION -> REJECTED (skip evaluation)", () => {
      expect(isValidConceptTransition("ELABORATION", "REJECTED")).toBe(false);
    });

    it("disallows APPROVED -> ELABORATION (terminal state)", () => {
      expect(isValidConceptTransition("APPROVED", "ELABORATION")).toBe(false);
    });

    it("disallows REJECTED -> ELABORATION (terminal state)", () => {
      expect(isValidConceptTransition("REJECTED", "ELABORATION")).toBe(false);
    });
  });

  describe("getConceptTransitionGuards", () => {
    it("returns guards for ELABORATION -> EVALUATION", () => {
      const guards = getConceptTransitionGuards("ELABORATION", "EVALUATION");
      expect(guards).toEqual(["HAS_PROBLEM_STATEMENT", "HAS_PROPOSED_SOLUTION"]);
    });

    it("returns empty array for transitions without guards", () => {
      expect(getConceptTransitionGuards("EVALUATION", "APPROVED")).toEqual([]);
      expect(getConceptTransitionGuards("EVALUATION", "REJECTED")).toEqual([]);
      expect(getConceptTransitionGuards("EVALUATION", "ELABORATION")).toEqual([]);
    });
  });

  describe("CONCEPT_STATUS_LABELS", () => {
    it("has labels for all statuses", () => {
      expect(CONCEPT_STATUS_LABELS.ELABORATION).toBe("Elaboration");
      expect(CONCEPT_STATUS_LABELS.EVALUATION).toBe("Evaluation");
      expect(CONCEPT_STATUS_LABELS.APPROVED).toBe("Approved");
      expect(CONCEPT_STATUS_LABELS.REJECTED).toBe("Rejected");
    });
  });

  describe("CONCEPT_PHASE_ORDER", () => {
    it("contains the 2 phases in order", () => {
      expect(CONCEPT_PHASE_ORDER).toEqual(["ELABORATION", "EVALUATION"]);
    });
  });

  describe("CONCEPT_GUARD_FAILURE_MESSAGES", () => {
    it("has messages for all guard IDs", () => {
      expect(CONCEPT_GUARD_FAILURE_MESSAGES.HAS_PROBLEM_STATEMENT).toBeDefined();
      expect(CONCEPT_GUARD_FAILURE_MESSAGES.HAS_PROPOSED_SOLUTION).toBeDefined();
    });
  });
});
