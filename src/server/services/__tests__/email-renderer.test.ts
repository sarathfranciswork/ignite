import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderNotificationEmail, renderDigestEmail } from "../email-renderer";
import { NotificationType } from "../../events/types";

// Set env vars before importing modules that read them
beforeEach(() => {
  vi.stubEnv("APP_URL", "https://app.test");
  vi.stubEnv("APP_NAME", "TestApp");
  vi.stubEnv("EMAIL_FROM", "test@test.com");
});

describe("email-renderer", () => {
  describe("renderNotificationEmail", () => {
    it("renders a full HTML email with base layout", () => {
      const result = renderNotificationEmail({
        type: NotificationType.IDEA_SUBMITTED,
        title: "My Great Idea",
        body: "A revolutionary concept",
        link: "https://app.test/ideas/123",
      });

      expect(result.subject).toBe("New idea submitted: My Great Idea");
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("TestApp");
      expect(result.html).toContain("My Great Idea");
      expect(result.html).toContain("A revolutionary concept");
      expect(result.html).toContain("https://app.test/ideas/123");
      expect(result.html).toContain("Manage preferences");
      expect(result.html).toContain("https://app.test/settings/notifications");
    });

    it("renders email without optional fields", () => {
      const result = renderNotificationEmail({
        type: NotificationType.CAMPAIGN_PHASE_CHANGED,
        title: "Q1 Campaign",
      });

      expect(result.subject).toBe("Campaign update: Q1 Campaign");
      expect(result.html).toContain("Q1 Campaign");
      expect(result.html).not.toContain("undefined");
    });

    it("renders email for unknown notification type", () => {
      const result = renderNotificationEmail({
        type: "CUSTOM_EVENT",
        title: "Custom Title",
        body: "Custom body text",
      });

      expect(result.subject).toBe("Custom Title");
      expect(result.html).toContain("Custom Title");
      expect(result.html).toContain("Custom body text");
    });
  });

  describe("renderDigestEmail", () => {
    it("renders a daily digest email", () => {
      const result = renderDigestEmail({
        userName: "Alice",
        frequency: "daily",
        period: "Monday, March 10, 2026",
        groups: [
          {
            label: "Your Ideas",
            count: 2,
            items: [
              { title: "New comment on Idea A", link: "https://app.test/a" },
              { title: "Idea B status changed" },
            ],
          },
        ],
        totalCount: 2,
      });

      expect(result.subject).toContain("Daily Digest");
      expect(result.subject).toContain("2 notifications");
      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("Alice");
      expect(result.html).toContain("Your Ideas");
      expect(result.html).toContain("https://app.test/a");
    });

    it("renders a weekly digest email", () => {
      const result = renderDigestEmail({
        userName: "Bob",
        frequency: "weekly",
        period: "Mar 3 – Mar 10",
        groups: [
          {
            label: "Campaign Updates",
            count: 1,
            items: [{ title: "Campaign moved to next phase" }],
          },
        ],
        totalCount: 1,
      });

      expect(result.subject).toContain("Weekly Digest");
      expect(result.subject).toContain("1 notification");
      expect(result.html).toContain("Bob");
    });
  });
});
