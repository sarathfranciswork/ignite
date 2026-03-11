import { describe, it, expect } from "vitest";
import { renderImmediateEmail, renderDigestEmail } from "./email-templates";
import type { NotificationEmailData } from "./email-templates";

describe("renderImmediateEmail", () => {
  const notification: NotificationEmailData = {
    type: "IDEA_SUBMITTED",
    title: "New idea submitted",
    body: 'Idea "Solar Panels" was submitted in campaign "Green Energy"',
    entityType: "idea",
    entityId: "idea-123",
  };

  it("renders subject with app name prefix", () => {
    const result = renderImmediateEmail("Alice", notification);
    expect(result.subject).toBe("[Ignite] New idea submitted");
  });

  it("renders HTML with notification title and body", () => {
    const result = renderImmediateEmail("Alice", notification);
    expect(result.html).toContain("New idea submitted");
    expect(result.html).toContain("Solar Panels");
    expect(result.html).toContain("View Details");
  });

  it("renders text fallback with URL", () => {
    const result = renderImmediateEmail("Alice", notification);
    expect(result.text).toContain("New idea submitted");
    expect(result.text).toContain("ideas/idea-123");
  });

  it("generates correct entity URL for campaigns", () => {
    const campaignNotification: NotificationEmailData = {
      type: "CAMPAIGN_PHASE_CHANGE",
      title: "Campaign phase changed",
      body: "Campaign moved to EVALUATION",
      entityType: "campaign",
      entityId: "campaign-456",
    };

    const result = renderImmediateEmail("Bob", campaignNotification);
    expect(result.html).toContain("campaigns/campaign-456");
  });
});

describe("renderDigestEmail", () => {
  const notifications: NotificationEmailData[] = [
    {
      type: "IDEA_SUBMITTED",
      title: "New idea submitted",
      body: 'Idea "Solar Panels" was submitted',
      entityType: "idea",
      entityId: "idea-1",
    },
    {
      type: "COMMENT_ON_FOLLOWED",
      title: "New comment on followed idea",
      body: 'A comment was posted on "Wind Turbines"',
      entityType: "idea",
      entityId: "idea-2",
    },
    {
      type: "MENTION",
      title: "You were mentioned",
      body: "You were mentioned in a comment",
      entityType: "comment",
      entityId: "comment-1",
    },
  ];

  it("renders daily digest subject", () => {
    const result = renderDigestEmail("Alice", notifications, "daily");
    expect(result.subject).toBe("[Ignite] Your Daily Notification Digest");
  });

  it("renders weekly digest subject", () => {
    const result = renderDigestEmail("Bob", notifications, "weekly");
    expect(result.subject).toBe("[Ignite] Your Weekly Notification Digest");
  });

  it("includes all notifications in the HTML", () => {
    const result = renderDigestEmail("Alice", notifications, "daily");
    expect(result.html).toContain("Solar Panels");
    expect(result.html).toContain("Wind Turbines");
    expect(result.html).toContain("You were mentioned");
  });

  it("includes notification type labels", () => {
    const result = renderDigestEmail("Alice", notifications, "daily");
    expect(result.html).toContain("New Idea");
    expect(result.html).toContain("New Comment");
    expect(result.html).toContain("Mention");
  });

  it("includes notification count in body", () => {
    const result = renderDigestEmail("Alice", notifications, "daily");
    expect(result.html).toContain("3 notifications");
  });

  it("renders text fallback with all items", () => {
    const result = renderDigestEmail("Alice", notifications, "daily");
    expect(result.text).toContain("[New Idea] New idea submitted");
    expect(result.text).toContain("[New Comment]");
    expect(result.text).toContain("[Mention]");
  });

  it("handles single notification correctly", () => {
    const single = [notifications[0]!];
    const result = renderDigestEmail("Alice", single, "daily");
    expect(result.html).toContain("1 notification ");
  });
});
