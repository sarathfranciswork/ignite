import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createTeamsIntegration,
  updateTeamsIntegration,
  deleteTeamsIntegration,
  getTeamsIntegrationById,
  listTeamsIntegrations,
  pauseTeamsIntegration,
  activateTeamsIntegration,
  getTeamsStatus,
  getAvailableTeamsEvents,
  dispatchEventToTeams,
  TeamsServiceError,
} from "./teams.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    teamsIntegration: {
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

const integrationCreate = prisma.teamsIntegration.create as unknown as Mock;
const integrationFindUnique = prisma.teamsIntegration.findUnique as unknown as Mock;
const integrationFindMany = prisma.teamsIntegration.findMany as unknown as Mock;
const integrationUpdate = prisma.teamsIntegration.update as unknown as Mock;
const integrationDelete = prisma.teamsIntegration.delete as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockIntegration = {
  id: "clx123",
  name: "Test Teams Channel",
  webhookUrl: "https://outlook.webhook.office.com/webhookb2/test",
  status: "ACTIVE",
  events: ["campaign.created", "idea.submitted"],
  description: "Test integration",
  campaignId: null,
  channelId: null,
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

describe("getTeamsStatus", () => {
  it("returns available status", () => {
    const status = getTeamsStatus();
    expect(status.available).toBe(true);
    expect(status.message).toContain("available");
  });
});

describe("getAvailableTeamsEvents", () => {
  it("returns array of event names", () => {
    const events = getAvailableTeamsEvents();
    expect(events).toContain("campaign.created");
    expect(events).toContain("idea.submitted");
    expect(events).toContain("idea.statusChanged");
    expect(events.length).toBeGreaterThan(5);
  });
});

describe("createTeamsIntegration", () => {
  it("creates an integration and emits event", async () => {
    integrationCreate.mockResolvedValue(mockIntegration);

    const result = await createTeamsIntegration(
      {
        name: "Test Teams Channel",
        webhookUrl: "https://outlook.webhook.office.com/webhookb2/test",
        events: ["campaign.created", "idea.submitted"],
        description: "Test integration",
      },
      "user1",
    );

    expect(result).toEqual(mockIntegration);
    expect(integrationCreate).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      "teams.integrationCreated",
      expect.objectContaining({
        entity: "TeamsIntegration",
        entityId: "clx123",
        actor: "user1",
      }),
    );
  });

  it("throws on invalid events", async () => {
    await expect(
      createTeamsIntegration(
        {
          name: "Test",
          webhookUrl: "https://outlook.webhook.office.com/webhookb2/test",
          events: ["invalid.event"],
        },
        "user1",
      ),
    ).rejects.toThrow(TeamsServiceError);
  });
});

describe("updateTeamsIntegration", () => {
  it("updates an existing integration", async () => {
    integrationFindUnique.mockResolvedValue(mockIntegration);
    integrationUpdate.mockResolvedValue({
      ...mockIntegration,
      name: "Updated Name",
    });

    const result = await updateTeamsIntegration({ id: "clx123", name: "Updated Name" }, "user1");

    expect(result.name).toBe("Updated Name");
    expect(mockEmit).toHaveBeenCalledWith(
      "teams.integrationUpdated",
      expect.objectContaining({ entityId: "clx123" }),
    );
  });

  it("throws NOT_FOUND for missing integration", async () => {
    integrationFindUnique.mockResolvedValue(null);

    await expect(updateTeamsIntegration({ id: "nonexistent" }, "user1")).rejects.toThrow(
      TeamsServiceError,
    );
  });
});

describe("deleteTeamsIntegration", () => {
  it("deletes an integration and emits event", async () => {
    integrationFindUnique.mockResolvedValue(mockIntegration);
    integrationDelete.mockResolvedValue(mockIntegration);

    await deleteTeamsIntegration("clx123", "user1");

    expect(integrationDelete).toHaveBeenCalledWith({
      where: { id: "clx123" },
    });
    expect(mockEmit).toHaveBeenCalledWith(
      "teams.integrationDeleted",
      expect.objectContaining({ entityId: "clx123" }),
    );
  });

  it("throws NOT_FOUND for missing integration", async () => {
    integrationFindUnique.mockResolvedValue(null);

    await expect(deleteTeamsIntegration("nonexistent", "user1")).rejects.toThrow(TeamsServiceError);
  });
});

describe("getTeamsIntegrationById", () => {
  it("returns integration by ID", async () => {
    integrationFindUnique.mockResolvedValue(mockIntegration);

    const result = await getTeamsIntegrationById("clx123");

    expect(result).toEqual(mockIntegration);
    expect(integrationFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "clx123" } }),
    );
  });

  it("throws NOT_FOUND for missing integration", async () => {
    integrationFindUnique.mockResolvedValue(null);

    await expect(getTeamsIntegrationById("nonexistent")).rejects.toThrow(TeamsServiceError);
  });
});

describe("listTeamsIntegrations", () => {
  it("returns paginated list", async () => {
    integrationFindMany.mockResolvedValue([mockIntegration]);

    const result = await listTeamsIntegrations({ limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      ...mockIntegration,
      id: `clx${i}`,
    }));
    integrationFindMany.mockResolvedValue(items);

    const result = await listTeamsIntegrations({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("clx2");
  });

  it("filters by campaignId", async () => {
    integrationFindMany.mockResolvedValue([]);

    await listTeamsIntegrations({ limit: 20, campaignId: "camp1" });

    expect(integrationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ campaignId: "camp1" }),
      }),
    );
  });
});

describe("pauseTeamsIntegration", () => {
  it("sets status to PAUSED", async () => {
    integrationUpdate.mockResolvedValue({
      ...mockIntegration,
      status: "PAUSED",
    });

    const result = await pauseTeamsIntegration("clx123", "user1");

    expect(result.status).toBe("PAUSED");
    expect(integrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "clx123" },
        data: { status: "PAUSED" },
      }),
    );
  });
});

describe("activateTeamsIntegration", () => {
  it("sets status to ACTIVE and clears error", async () => {
    integrationUpdate.mockResolvedValue({
      ...mockIntegration,
      status: "ACTIVE",
      lastError: null,
    });

    const result = await activateTeamsIntegration("clx123", "user1");

    expect(result.status).toBe("ACTIVE");
    expect(integrationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "ACTIVE", lastError: null },
      }),
    );
  });
});

describe("dispatchEventToTeams", () => {
  it("does nothing when no matching integrations", async () => {
    integrationFindMany.mockResolvedValue([]);

    await dispatchEventToTeams("campaign.created", {
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
      webhookUrl: "https://outlook.webhook.office.com/webhookb2/test",
      name: "Test",
      campaignId: null,
      channelId: null,
    };
    integrationFindMany.mockResolvedValue([integration]);

    // Mock fetch globally
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("1"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await dispatchEventToTeams("campaign.created", {
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
});
