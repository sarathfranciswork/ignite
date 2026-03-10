import { describe, it, expect } from "vitest";
import { getValidTransitions, isValidTransition, getTransitionDef } from "./campaign-transitions";

describe("campaign-transitions", () => {
  describe("getValidTransitions", () => {
    it("returns transitions from DRAFT", () => {
      const transitions = getValidTransitions("DRAFT");
      expect(transitions.length).toBe(2);
      expect(transitions.map((t) => t.to)).toContain("SEEDING");
      expect(transitions.map((t) => t.to)).toContain("SUBMISSION");
    });

    it("returns transitions from SEEDING", () => {
      const transitions = getValidTransitions("SEEDING");
      expect(transitions.map((t) => t.to)).toContain("SUBMISSION");
      expect(transitions.map((t) => t.to)).toContain("DRAFT");
    });

    it("returns transitions from SUBMISSION", () => {
      const transitions = getValidTransitions("SUBMISSION");
      expect(transitions.map((t) => t.to)).toContain("DISCUSSION_VOTING");
    });

    it("returns transitions from DISCUSSION_VOTING", () => {
      const transitions = getValidTransitions("DISCUSSION_VOTING");
      expect(transitions.map((t) => t.to)).toContain("EVALUATION");
    });

    it("returns transitions from EVALUATION", () => {
      const transitions = getValidTransitions("EVALUATION");
      expect(transitions.map((t) => t.to)).toContain("CLOSED");
    });

    it("returns reopen transition from CLOSED", () => {
      const transitions = getValidTransitions("CLOSED");
      expect(transitions.map((t) => t.to)).toContain("EVALUATION");
    });
  });

  describe("isValidTransition", () => {
    it("returns true for valid transitions", () => {
      expect(isValidTransition("DRAFT", "SEEDING")).toBe(true);
      expect(isValidTransition("DRAFT", "SUBMISSION")).toBe(true);
      expect(isValidTransition("SEEDING", "SUBMISSION")).toBe(true);
      expect(isValidTransition("SUBMISSION", "DISCUSSION_VOTING")).toBe(true);
      expect(isValidTransition("DISCUSSION_VOTING", "EVALUATION")).toBe(true);
      expect(isValidTransition("EVALUATION", "CLOSED")).toBe(true);
    });

    it("returns false for invalid transitions", () => {
      expect(isValidTransition("DRAFT", "EVALUATION")).toBe(false);
      expect(isValidTransition("DRAFT", "CLOSED")).toBe(false);
      expect(isValidTransition("SUBMISSION", "CLOSED")).toBe(false);
      expect(isValidTransition("CLOSED", "DRAFT")).toBe(false);
    });

    it("allows backward transitions for revert", () => {
      expect(isValidTransition("SEEDING", "DRAFT")).toBe(true);
      expect(isValidTransition("SUBMISSION", "SEEDING")).toBe(true);
      expect(isValidTransition("DISCUSSION_VOTING", "SUBMISSION")).toBe(true);
      expect(isValidTransition("EVALUATION", "DISCUSSION_VOTING")).toBe(true);
      expect(isValidTransition("CLOSED", "EVALUATION")).toBe(true);
    });
  });

  describe("getTransitionDef", () => {
    it("returns the transition definition for a valid transition", () => {
      const def = getTransitionDef("DRAFT", "SEEDING");
      expect(def).toBeDefined();
      expect(def?.to).toBe("SEEDING");
      expect(def?.effects).toContain("campaign.phaseChanged");
    });

    it("returns undefined for an invalid transition", () => {
      const def = getTransitionDef("DRAFT", "CLOSED");
      expect(def).toBeUndefined();
    });

    it("includes campaign.phaseChanged effect on all transitions", () => {
      const def = getTransitionDef("SUBMISSION", "DISCUSSION_VOTING");
      expect(def?.effects).toContain("campaign.phaseChanged");
    });
  });
});
