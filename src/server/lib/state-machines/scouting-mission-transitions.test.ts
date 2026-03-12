import { describe, it, expect } from "vitest";
import {
  getValidScoutingMissionTransitions,
  isValidScoutingMissionTransition,
  SCOUTING_MISSION_STATUS_LABELS,
  SCOUTING_MISSION_PHASE_ORDER,
} from "./scouting-mission-transitions";

describe("scouting-mission-transitions", () => {
  describe("getValidScoutingMissionTransitions", () => {
    it("OPEN can transition to IN_PROGRESS or COMPLETED", () => {
      const transitions = getValidScoutingMissionTransitions("OPEN");
      expect(transitions).toContain("IN_PROGRESS");
      expect(transitions).toContain("COMPLETED");
    });

    it("IN_PROGRESS can transition to COMPLETED or OPEN", () => {
      const transitions = getValidScoutingMissionTransitions("IN_PROGRESS");
      expect(transitions).toContain("COMPLETED");
      expect(transitions).toContain("OPEN");
    });

    it("COMPLETED can transition back to OPEN", () => {
      const transitions = getValidScoutingMissionTransitions("COMPLETED");
      expect(transitions).toContain("OPEN");
    });
  });

  describe("isValidScoutingMissionTransition", () => {
    it("allows OPEN -> IN_PROGRESS", () => {
      expect(isValidScoutingMissionTransition("OPEN", "IN_PROGRESS")).toBe(true);
    });

    it("allows OPEN -> COMPLETED", () => {
      expect(isValidScoutingMissionTransition("OPEN", "COMPLETED")).toBe(true);
    });

    it("allows IN_PROGRESS -> COMPLETED", () => {
      expect(isValidScoutingMissionTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    });

    it("allows IN_PROGRESS -> OPEN (revert)", () => {
      expect(isValidScoutingMissionTransition("IN_PROGRESS", "OPEN")).toBe(true);
    });

    it("allows COMPLETED -> OPEN (reopen)", () => {
      expect(isValidScoutingMissionTransition("COMPLETED", "OPEN")).toBe(true);
    });

    it("rejects COMPLETED -> IN_PROGRESS", () => {
      expect(isValidScoutingMissionTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
    });

    it("rejects OPEN -> OPEN (same state)", () => {
      expect(isValidScoutingMissionTransition("OPEN", "OPEN")).toBe(false);
    });
  });

  describe("constants", () => {
    it("has labels for all statuses", () => {
      expect(SCOUTING_MISSION_STATUS_LABELS.OPEN).toBe("Open");
      expect(SCOUTING_MISSION_STATUS_LABELS.IN_PROGRESS).toBe("In Progress");
      expect(SCOUTING_MISSION_STATUS_LABELS.COMPLETED).toBe("Completed");
    });

    it("has correct phase order", () => {
      expect(SCOUTING_MISSION_PHASE_ORDER).toEqual(["OPEN", "IN_PROGRESS", "COMPLETED"]);
    });
  });
});
