import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createSlackIntegration,
  updateSlackIntegration,
  deleteSlackIntegration,
  getSlackIntegrationById,
  listSlackIntegrations,
  pauseSlackIntegration,
  activateSlackIntegration,
  getSlackStatus,
  getAvailableSlackEvents,
  dispatchEventToSlack,
  SlackServiceError,
} from "./slack-integration.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    slackIntegration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const integrationCreate = prisma.slackIntegration.create as unknown as Mock;
const integrationFindUnique = prisma.slackIntegration.findUnique as unknown as Mock;
const integrationFindMany = prisma.slackIntegration.findMany as unknown as Mock;
const integrationUpdate = prisma.slackIntegration.update as unknown as Mock;
const integrationDelete = prisma.slackIntegration.delete as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockIntegration = {
  id: "clx123",
  name: "Test Slack Channel",
  webhookUrl: "https://hooks.slack.com/services/T123/B456/abc123",
  status: "ACTIVE",
  events: ["campaign.created", "idea.submitted"],
  description: "Test integration",
  campaignId: null,
  channelId: null,
  spaceId: null,
  teamId: null,
  accessToken: null,
  botUserId: null,
  channelMappings: {},
  isActive: true,
  createdById: "user1",
  lastError: null,
  lastSentAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: { id: "user1", name: "Admin", email: "admin@test.com" },
  campaign: null,
  channel: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSlackStatus", () => {
  it("returns available status", () => {
    const status = getSlackStatus();
    expect(status.available).toBe(true);
    expect(status.message).toContain("available");
  });
});

describe("getAvailableSlackEvents", () => {
  it("returns array of event names", () => {
    const events = getAvailableSlackEvents();
    expect(events).toContain("campaign.created");
    expect(events).toContain("idea.submitted");
    expect(events).toContain("idea.statusChanged");
    expect(events.length).toBeGreaterThan(5);
  });
});

describe("createSlackIntegration", () => {
  it("creates an integration and emits event", async () => {
    integrationCreate.mockResolvedValue(mockIntegration);

    const result = await createSlackIntegration(
      {
        name: "Test Slack Channel",
        webhookUrl: "https://hooks.slack.com/services/T123/B456/abc123",
        events: ["campaign.created", "idea.submitted"],
        description: "Test integration",
      },
      "user1",
    );

    expect(result).toEqual(mockIntegration);
    expect(integrationCreate).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      "slack.integrationCreated",
      expect.objectContaining({
        entity: "SlackIntegration",
        entityId: "clx123",
        actor: "user1",
      }),
    );
  });

  it("throws on invalid events", async () => {
    await expect(
      createSlackIntegration(
        {
          name: "Test",
          webhookUrl: "https://hooks.slack.com/services/T123/B456/abc123",
          events: ["invalid.event"],
        },
        "user1",
      ),
    ).rejects.toThrow(SlackServiceError);
  });
});

describe("updateSlackIntegration", () => {
  it("updates an existing integration", async () => {
    integrationFindUnique.mockResolvedValue(mockIntegration);
    integrationUpdate.mockResolvedValue({
      ...mockIntegration,
      name: "Updated Name",
    });

    const result = await updateSlackIntegration({ id: "clx123", name: "Updated Name" }, "user1");

    expect(result.name).toBe("Updated Name");
    expect(mockEmit).toHaveBeenCalledWith(
      "slack.integrationUpdated",
      expect.objectContaining({ entityId: "clx123" }),
    );
  });

  it("throws NOT_FOUND for missing integration", async () => {
    integrationFindUnique.mockResolvedValue(null);

    await expect(updateSlackIntegration({ id: "nonexistent" }, "user1")).rejects.toThrow(
      SlackServiceError,
    );
  });
});

describe("deleteSlackIntegration", () => {
  it("deletes an integration and emits event", async () => {
    integrationFindUnique.mockResolvedValue(mockIntegration);
    integrationDelete.mockResolvedValue(mockIntegration);

    await deleteSlackIntegration("clx123", "user1");

    expect(integrationDelete).toHaveBeenCalledWith({
      where: { id: "clx123" },
    });
    expect(mockEmit).toHaveBeenCalledWith(
      "slack.integrationDeleted",
      expect.objectContaining({ entityId: "clx123" }),
    );
  });

  it("throws NOT_FOUND for missing integration", async () => {
    integrationFindUnique.mockResolvedValue(null);

    await expect(deleteSlackIntegration("nonexistent", "user1")).rejects.toThrow(SlackServiceError);
  });
});

describe("getSlackIntegrationById", () => {
  it("returns integration by ID", async () => {
    integrationFindUnique.mockResolvedValue(mockIntegration);

    const result = await getSlackIntegrationById("clx123");

    expect(result).toEqual(mockIntegration);
    expect(integrationFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "clx123" } }),
    );
  });

  it("throws NOT_FOUND for missing integration", async () => {
    integrationFindUnique.mockResolvedValue(null);

    await expect(getSlackIntegrationById("nonexistent")).rejects.toThrow(SlackServiceError);
  });
});

describe("listSlackIntegrations", () => {
  it("returns paginated list", async () => {
    integrationFindMany.mockResolvedValue([mockIntegration]);

    const result = await listSlackIntegrations({ limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      ...mockIntegration,
      id: `clx${i}`,
    }));
    integrationFindMany.mockResolvedValue(items);

    const result = await listSlackIntegrations({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("clx2");
  });

  it("filters by campaignId", async () => {
    integrationFindMany.mockResolvedValue([]);

    await listSlackIntegrations({ limit: 20, campaignId: "camp1" });

    expect(integrationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ campaignId: "camp1" }),
      }),
    );
  });
});

describe("pauseSlackIntegration", () => {
  it("sets status to PAUSED", async () => {
    integrationUpdate.mockResolvedValue({
      ...mockIntegration,
      status: "PAUSED",
    });

    const result = await pauseSlackIntegration("clx123", "user1");

    expect(result.status).toBe("PAUSED");
    expect(integrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clx123" },
        data: { status: "PAUSED" },
      }),
    );
  });
});

describe("activateSlackIntegration", () => {
  it("sets status to ACTIVE and clears error", async () => {
    integrationUpdate.mockResolvedValue({
      ...mockIntegration,
      status: "ACTIVE",
      lastError: null,
    });

    const result = await activateSlackIntegration("clx123", "user1");

    expect(result.status).toBe("ACTIVE");
    expect(integrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "ACTIVE", lastError: null },
      }),
    );
  });
});

describe("dispatchEventToSlack", () => {
  it("does nothing when no matching integrations", async () => {
    integrationFindMany.mockResolvedValue([]);

    await dispatchEventToSlack("campaign.created", {
      entity: "Campaign",
      entityId: "camp1",
      actor: "user1",
      timestamp: new Date().toISOString(),
    });

    expect(integrationUpdate).not.toHaveBeenCalled();
  });

  it("sends notifications to matching integrations", async () => {
    const integration = {
      id: "clx123",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc123",
      name: "Test",
      campaignId: null,
      channelId: null,
    };
    integrationFindMany.mockResolvedValue([integration]);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("ok"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await dispatchEventToSlack("campaign.created", {
      entity: "Campaign",
      entityId: "camp1",
      actor: "user1",
      timestamp: new Date().toISOString(),
      metadata: { title: "New Campaign" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      integration.webhookUrl,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(integrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clx123" },
        data: expect.objectContaining({ lastSentAt: expect.any(Date) }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("records error on webhook failure", async () => {
    const integration = {
      id: "clx123",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc123",
      name: "Test",
      campaignId: null,
      channelId: null,
    };
    integrationFindMany.mockResolvedValue([integration]);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Server Error"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await dispatchEventToSlack("campaign.created", {
      entity: "Campaign",
      entityId: "camp1",
      actor: "user1",
      timestamp: new Date().toISOString(),
    });

    expect(integrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clx123" },
        data: expect.objectContaining({
          lastError: expect.any(String),
          status: "ERROR",
        }),
      }),
    );

    vi.unstubAllGlobals();
  });

  it("skips integrations with mismatched campaignId", async () => {
    const integration = {
      id: "clx123",
      webhookUrl: "https://hooks.slack.com/services/T123/B456/abc123",
      name: "Test",
      campaignId: "camp-specific",
      channelId: null,
    };
    integrationFindMany.mockResolvedValue([integration]);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("ok"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await dispatchEventToSlack("campaign.created", {
      entity: "Campaign",
      entityId: "camp1",
      actor: "user1",
      timestamp: new Date().toISOString(),
      metadata: { campaignId: "camp-other" },
    });

    expect(mockFetch).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
