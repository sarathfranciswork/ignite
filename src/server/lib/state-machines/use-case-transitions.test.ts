import { describe, it, expect } from "vitest";
import {
  getValidUseCaseTransitions,
  isValidUseCaseTransition,
  getUseCaseTransitionGuards,
  USE_CASE_STATUS_LABELS,
  USE_CASE_PHASE_ORDER,
  USE_CASE_GUARD_FAILURE_MESSAGES,
} from "./use-case-transitions";

describe("use-case-transitions", () => {
  describe("getValidUseCaseTransitions", () => {
    it("returns QUALIFICATION and ARCHIVED from IDENTIFIED", () => {
      const transitions = getValidUseCaseTransitions("IDENTIFIED");
      expect(transitions).toEqual(["QUALIFICATION", "ARCHIVED"]);
    });

    it("returns EVALUATION and ARCHIVED from QUALIFICATION", () => {
      const transitions = getValidUseCaseTransitions("QUALIFICATION");
      expect(transitions).toEqual(["EVALUATION", "ARCHIVED"]);
    });

    it("returns PILOT and ARCHIVED from EVALUATION", () => {
      const transitions = getValidUseCaseTransitions("EVALUATION");
      expect(transitions).toEqual(["PILOT", "ARCHIVED"]);
    });

    it("returns PARTNERSHIP and ARCHIVED from PILOT", () => {
      const transitions = getValidUseCaseTransitions("PILOT");
      expect(transitions).toEqual(["PARTNERSHIP", "ARCHIVED"]);
    });

    it("returns only ARCHIVED from PARTNERSHIP", () => {
      const transitions = getValidUseCaseTransitions("PARTNERSHIP");
      expect(transitions).toEqual(["ARCHIVED"]);
    });

    it("returns IDENTIFIED from ARCHIVED (reactivation)", () => {
      const transitions = getValidUseCaseTransitions("ARCHIVED");
      expect(transitions).toEqual(["IDENTIFIED"]);
    });
  });

  describe("isValidUseCaseTransition", () => {
    it("allows IDENTIFIED -> QUALIFICATION", () => {
      expect(isValidUseCaseTransition("IDENTIFIED", "QUALIFICATION")).toBe(true);
    });

    it("allows IDENTIFIED -> ARCHIVED", () => {
      expect(isValidUseCaseTransition("IDENTIFIED", "ARCHIVED")).toBe(true);
    });

    it("allows ARCHIVED -> IDENTIFIED (reactivation)", () => {
      expect(isValidUseCaseTransition("ARCHIVED", "IDENTIFIED")).toBe(true);
    });

    it("disallows skipping phases", () => {
      expect(isValidUseCaseTransition("IDENTIFIED", "EVALUATION")).toBe(false);
      expect(isValidUseCaseTransition("IDENTIFIED", "PILOT")).toBe(false);
      expect(isValidUseCaseTransition("QUALIFICATION", "PARTNERSHIP")).toBe(false);
    });

    it("disallows backward transitions", () => {
      expect(isValidUseCaseTransition("QUALIFICATION", "IDENTIFIED")).toBe(false);
      expect(isValidUseCaseTransition("EVALUATION", "QUALIFICATION")).toBe(false);
      expect(isValidUseCaseTransition("PARTNERSHIP", "PILOT")).toBe(false);
    });
  });

  describe("getUseCaseTransitionGuards", () => {
    it("returns HAS_LINKED_ORGANIZATION for IDENTIFIED -> QUALIFICATION", () => {
      const guards = getUseCaseTransitionGuards("IDENTIFIED", "QUALIFICATION");
      expect(guards).toEqual(["HAS_LINKED_ORGANIZATION"]);
    });

    it("returns HAS_TEAM_ASSIGNED for QUALIFICATION -> EVALUATION", () => {
      const guards = getUseCaseTransitionGuards("QUALIFICATION", "EVALUATION");
      expect(guards).toEqual(["HAS_TEAM_ASSIGNED"]);
    });

    it("returns empty array for transitions without guards", () => {
      expect(getUseCaseTransitionGuards("EVALUATION", "PILOT")).toEqual([]);
      expect(getUseCaseTransitionGuards("PILOT", "PARTNERSHIP")).toEqual([]);
      expect(getUseCaseTransitionGuards("IDENTIFIED", "ARCHIVED")).toEqual([]);
    });
  });

  describe("USE_CASE_STATUS_LABELS", () => {
    it("has labels for all statuses", () => {
      expect(USE_CASE_STATUS_LABELS.IDENTIFIED).toBe("Identified");
      expect(USE_CASE_STATUS_LABELS.QUALIFICATION).toBe("Qualification");
      expect(USE_CASE_STATUS_LABELS.EVALUATION).toBe("Evaluation");
      expect(USE_CASE_STATUS_LABELS.PILOT).toBe("Pilot");
      expect(USE_CASE_STATUS_LABELS.PARTNERSHIP).toBe("Partnership");
      expect(USE_CASE_STATUS_LABELS.ARCHIVED).toBe("Archived");
    });
  });

  describe("USE_CASE_PHASE_ORDER", () => {
    it("contains the 5 pipeline phases in order (excludes ARCHIVED)", () => {
      expect(USE_CASE_PHASE_ORDER).toEqual([
        "IDENTIFIED",
        "QUALIFICATION",
        "EVALUATION",
        "PILOT",
        "PARTNERSHIP",
      ]);
    });
  });

  describe("USE_CASE_GUARD_FAILURE_MESSAGES", () => {
    it("has messages for all guard IDs", () => {
      expect(USE_CASE_GUARD_FAILURE_MESSAGES.HAS_LINKED_ORGANIZATION).toBeDefined();
      expect(USE_CASE_GUARD_FAILURE_MESSAGES.HAS_TEAM_ASSIGNED).toBeDefined();
      expect(USE_CASE_GUARD_FAILURE_MESSAGES.HAS_EVALUATION_NOTES).toBeDefined();
    });
  });
});
