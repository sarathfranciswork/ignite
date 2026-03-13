import { describe, it, expect } from "vitest";
import {
  slackIntegrationCreateInput,
  slackIntegrationUpdateInput,
  slackIntegrationListInput,
  SLACK_AVAILABLE_EVENTS,
} from "./slack-integration.schemas";

describe("slackIntegrationCreateInput", () => {
  it("accepts valid input", () => {
    const result = slackIntegrationCreateInput.safeParse({
      name: "Test Integration",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc",
      events: ["campaign.created"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-HTTPS webhook URL", () => {
    const result = slackIntegrationCreateInput.safeParse({
      name: "Test",
      webhookUrl: "http://hooks.slack.com/services/T123/B456/abc",
      events: ["campaign.created"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = slackIntegrationCreateInput.safeParse({
      name: "",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc",
      events: ["campaign.created"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty events array", () => {
    const result = slackIntegrationCreateInput.safeParse({
      name: "Test",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc",
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional description", () => {
    const result = slackIntegrationCreateInput.safeParse({
      name: "Test",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc",
      events: ["campaign.created"],
      description: "A test integration",
    });
    expect(result.success).toBe(true);
  });
});

describe("slackIntegrationUpdateInput", () => {
  it("accepts partial update", () => {
    const result = slackIntegrationUpdateInput.safeParse({
      id: "clx123",
      name: "Updated",
    });
    expect(result.success).toBe(true);
  });

  it("requires id", () => {
    const result = slackIntegrationUpdateInput.safeParse({
      name: "Updated",
    });
    expect(result.success).toBe(false);
  });

  it("accepts isActive toggle", () => {
    const result = slackIntegrationUpdateInput.safeParse({
      id: "clx123",
      isActive: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("slackIntegrationListInput", () => {
  it("accepts empty input with defaults", () => {
    const result = slackIntegrationListInput.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("accepts filters", () => {
    const result = slackIntegrationListInput.safeParse({
      campaignId: "camp1",
      channelId: "chan1",
      cursor: "cursor1",
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit above 100", () => {
    const result = slackIntegrationListInput.safeParse({
      limit: 200,
    });
    expect(result.success).toBe(false);
  });
});

describe("SLACK_AVAILABLE_EVENTS", () => {
  it("includes campaign events", () => {
    expect(SLACK_AVAILABLE_EVENTS).toContain("campaign.created");
    expect(SLACK_AVAILABLE_EVENTS).toContain("campaign.phaseChanged");
  });

  it("includes idea events", () => {
    expect(SLACK_AVAILABLE_EVENTS).toContain("idea.created");
    expect(SLACK_AVAILABLE_EVENTS).toContain("idea.submitted");
  });

  it("includes evaluation events", () => {
    expect(SLACK_AVAILABLE_EVENTS).toContain("evaluation.sessionCreated");
    expect(SLACK_AVAILABLE_EVENTS).toContain("evaluation.completed");
  });

  it("has at least 10 events", () => {
    expect(SLACK_AVAILABLE_EVENTS.length).toBeGreaterThanOrEqual(10);
  });
});
