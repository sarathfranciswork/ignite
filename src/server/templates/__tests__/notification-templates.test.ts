import { describe, it, expect } from "vitest";
import {
  renderSubject,
  renderBody,
  templates,
} from "../notification-templates";
import { NotificationType } from "../../events/types";

describe("notification-templates", () => {
  describe("renderSubject", () => {
    it("renders IDEA_SUBMITTED subject with title", () => {
      const result = renderSubject(NotificationType.IDEA_SUBMITTED, {
        title: "My Great Idea",
      });
      expect(result).toBe("New idea submitted: My Great Idea");
    });

    it("renders EVALUATION_REQUESTED subject", () => {
      const result = renderSubject(NotificationType.EVALUATION_REQUESTED, {
        title: "Q1 Evaluation Session",
      });
      expect(result).toBe("Evaluation requested: Q1 Evaluation Session");
    });

    it("renders IDEA_HOT_GRADUATION subject", () => {
      const result = renderSubject(NotificationType.IDEA_HOT_GRADUATION, {
        title: "Innovation Hub",
      });
      expect(result).toBe("Your idea is HOT! Innovation Hub");
    });

    it("renders MENTION subject", () => {
      const result = renderSubject(NotificationType.MENTION, {
        title: "Discussion Thread",
      });
      expect(result).toBe("You were mentioned in: Discussion Thread");
    });

    it("falls back for unknown type", () => {
      const result = renderSubject("UNKNOWN_TYPE", { title: "Test" });
      expect(result).toBe("Test");
    });
  });

  describe("renderBody", () => {
    it("renders IDEA_SUBMITTED body with all fields", () => {
      const result = renderBody(NotificationType.IDEA_SUBMITTED, {
        title: "My Idea",
        body: "A great concept",
        link: "https://app.test/ideas/123",
      });
      expect(result).toContain("New Idea Submitted");
      expect(result).toContain("My Idea");
      expect(result).toContain("A great concept");
      expect(result).toContain("https://app.test/ideas/123");
      expect(result).toContain("View Idea");
    });

    it("renders body without optional fields", () => {
      const result = renderBody(NotificationType.IDEA_SUBMITTED, {
        title: "My Idea",
      });
      expect(result).toContain("My Idea");
      expect(result).not.toContain("undefined");
    });

    it("renders CAMPAIGN_PHASE_CHANGED body", () => {
      const result = renderBody(NotificationType.CAMPAIGN_PHASE_CHANGED, {
        title: "Innovation Challenge 2026",
        body: "Moved to evaluation phase",
      });
      expect(result).toContain("Campaign Phase Changed");
      expect(result).toContain("Innovation Challenge 2026");
      expect(result).toContain("Moved to evaluation phase");
    });

    it("renders fallback body for unknown type", () => {
      const result = renderBody("UNKNOWN_TYPE", {
        title: "Test Title",
        body: "Test Body",
        link: "https://example.com",
      });
      expect(result).toContain("Test Title");
      expect(result).toContain("Test Body");
      expect(result).toContain("https://example.com");
    });
  });

  describe("templates registry", () => {
    it("has a template for every NotificationType", () => {
      for (const type of Object.values(NotificationType)) {
        expect(templates[type]).toBeDefined();
        expect(templates[type].subject).toBeTruthy();
        expect(templates[type].body).toBeTruthy();
      }
    });
  });
});
