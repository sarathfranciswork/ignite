import { describe, it, expect } from "vitest";
import {
  scoutingMissionCreateInput,
  scoutingMissionUpdateInput,
  scoutingMissionTransitionInput,
  scoutingMissionListInput,
  scoutingMissionAssignScoutsInput,
  scoutingMissionRemoveScoutInput,
} from "./scouting-mission.schemas";

describe("scouting-mission schemas", () => {
  describe("scoutingMissionCreateInput", () => {
    it("accepts valid input with required fields", () => {
      const result = scoutingMissionCreateInput.safeParse({
        title: "Find AI Vision Partners",
        problemStatement: "We need partners with computer vision expertise for QA automation",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid input with all fields", () => {
      const result = scoutingMissionCreateInput.safeParse({
        title: "Find AI Vision Partners",
        problemStatement: "We need partners with computer vision expertise",
        requirements: [
          { label: "Computer Vision", priority: "MUST_HAVE" },
          { label: "Cloud deployment", description: "AWS or Azure", priority: "NICE_TO_HAVE" },
        ],
        targetIndustries: ["AI/ML", "Manufacturing"],
        targetRegions: ["Europe", "North America"],
        deadline: "2026-06-01T00:00:00.000Z",
        scoutIds: [],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = scoutingMissionCreateInput.safeParse({
        title: "",
        problemStatement: "Some statement",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty problem statement", () => {
      const result = scoutingMissionCreateInput.safeParse({
        title: "Valid Title",
        problemStatement: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects title over 200 chars", () => {
      const result = scoutingMissionCreateInput.safeParse({
        title: "a".repeat(201),
        problemStatement: "Valid statement",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("scoutingMissionUpdateInput", () => {
    it("accepts partial updates", () => {
      const result = scoutingMissionUpdateInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        title: "Updated Title",
      });
      expect(result.success).toBe(true);
    });

    it("accepts nullable deadline", () => {
      const result = scoutingMissionUpdateInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        deadline: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("scoutingMissionTransitionInput", () => {
    it("accepts valid transition", () => {
      const result = scoutingMissionTransitionInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        targetStatus: "IN_PROGRESS",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = scoutingMissionTransitionInput.safeParse({
        id: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        targetStatus: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("scoutingMissionListInput", () => {
    it("uses defaults", () => {
      const result = scoutingMissionListInput.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe("createdAt");
        expect(result.data.sortDirection).toBe("desc");
      }
    });

    it("accepts status filter", () => {
      const result = scoutingMissionListInput.safeParse({
        status: "OPEN",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("scoutingMissionAssignScoutsInput", () => {
    it("accepts valid scout assignment", () => {
      const result = scoutingMissionAssignScoutsInput.safeParse({
        missionId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        scoutIds: ["clyyyyyyyyyyyyyyyyyyyyyyyyy"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty scoutIds", () => {
      const result = scoutingMissionAssignScoutsInput.safeParse({
        missionId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        scoutIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("scoutingMissionRemoveScoutInput", () => {
    it("accepts valid input", () => {
      const result = scoutingMissionRemoveScoutInput.safeParse({
        missionId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        scoutId: "clyyyyyyyyyyyyyyyyyyyyyyyyy",
      });
      expect(result.success).toBe(true);
    });
  });
});
