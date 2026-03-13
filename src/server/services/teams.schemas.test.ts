import { describe, it, expect } from "vitest";
import {
  teamsIntegrationCreateInput,
  teamsIntegrationUpdateInput,
  teamsIntegrationListInput,
  teamsWebhookUrlSchema,
  TEAMS_AVAILABLE_EVENTS,
} from "./teams.schemas";

describe("teamsWebhookUrlSchema", () => {
  it("accepts valid HTTPS Teams webhook URLs", () => {
    const result = teamsWebhookUrlSchema.safeParse(
      "https://outlook.webhook.office.com/webhookb2/abc123",
    );
    expect(result.success).toBe(true);
  });

  it("accepts Azure Logic App webhook URLs", () => {
    const result = teamsWebhookUrlSchema.safeParse(
      "https://prod-00.westus.logic.azure.com/workflows/abc123",
    );
    expect(result.success).toBe(true);
  });

  it("rejects HTTP URLs", () => {
    const result = teamsWebhookUrlSchema.safeParse(
      "http://outlook.webhook.office.com/webhookb2/abc123",
    );
    expect(result.success).toBe(false);
  });

  it("rejects non-URL strings", () => {
    const result = teamsWebhookUrlSchema.safeParse("not a url");
    expect(result.success).toBe(false);
  });
});

describe("teamsIntegrationCreateInput", () => {
  const validInput = {
    name: "Test Integration",
    webhookUrl: "https://outlook.webhook.office.com/webhookb2/abc123",
    events: ["campaign.created"],
  };

  it("accepts valid input", () => {
    const result = teamsIntegrationCreateInput.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("requires at least one event", () => {
    const result = teamsIntegrationCreateInput.safeParse({
      ...validInput,
      events: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    const result = teamsIntegrationCreateInput.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional description and campaign/channel IDs", () => {
    const result = teamsIntegrationCreateInput.safeParse({
      ...validInput,
      description: "A description",
      campaignId: "camp123",
      channelId: "chan456",
    });
    expect(result.success).toBe(true);
  });
});

describe("teamsIntegrationUpdateInput", () => {
  it("requires only id", () => {
    const result = teamsIntegrationUpdateInput.safeParse({ id: "clx123" });
    expect(result.success).toBe(true);
  });

  it("accepts partial updates", () => {
    const result = teamsIntegrationUpdateInput.safeParse({
      id: "clx123",
      name: "New Name",
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable campaignId", () => {
    const result = teamsIntegrationUpdateInput.safeParse({
      id: "clx123",
      campaignId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("teamsIntegrationListInput", () => {
  it("has sensible defaults", () => {
    const result = teamsIntegrationListInput.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("accepts cursor and limit", () => {
    const result = teamsIntegrationListInput.safeParse({
      cursor: "clx123",
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects limit over 100", () => {
    const result = teamsIntegrationListInput.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });
});

describe("TEAMS_AVAILABLE_EVENTS", () => {
  it("contains campaign events", () => {
    expect(TEAMS_AVAILABLE_EVENTS).toContain("campaign.created");
    expect(TEAMS_AVAILABLE_EVENTS).toContain("campaign.phaseChanged");
  });

  it("contains idea events", () => {
    expect(TEAMS_AVAILABLE_EVENTS).toContain("idea.created");
    expect(TEAMS_AVAILABLE_EVENTS).toContain("idea.submitted");
  });

  it("contains evaluation events", () => {
    expect(TEAMS_AVAILABLE_EVENTS).toContain("evaluation.sessionCreated");
    expect(TEAMS_AVAILABLE_EVENTS).toContain("evaluation.completed");
  });
});
