import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: { findUnique: vi.fn() },
    campaign: { findUnique: vi.fn() },
    campaignMember: { findMany: vi.fn() },
    ideaFollow: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
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

vi.mock("@/server/events/event-bus", () => {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    eventBus: {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
      }),
      emit: vi.fn(),
      _handlers: handlers,
    },
  };
});

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignMemberFindMany = prisma.campaignMember.findMany as unknown as Mock;
const ideaFollowFindMany = prisma.ideaFollow.findMany as unknown as Mock;
const notificationCreateMany = prisma.notification.createMany as unknown as Mock;

const handlers = (eventBus as unknown as { _handlers: Record<string, ((...args: unknown[]) => Promise<void>)[]> })._handlers;

beforeEach(() => {
  vi.clearAllMocks();
  // Clear handlers
  for (const key of Object.keys(handlers)) {
    delete handlers[key];
  }
});

async function registerAndGetHandler(eventName: string) {
  // Reset the global guard so we can re-register
  const globalForListeners = globalThis as unknown as {
    notificationListenersRegistered: boolean | undefined;
  };
  globalForListeners.notificationListenersRegistered = false;

  const { registerNotificationListeners } = await import("./notification.listener");
  registerNotificationListeners();

  const eventHandlers = handlers[eventName];
  if (!eventHandlers || eventHandlers.length === 0) {
    throw new Error(`No handler registered for event: ${eventName}`);
  }
  return eventHandlers[0]!;
}

describe("notification listener", () => {
  describe("idea.submitted", () => {
    it("creates notifications for campaign managers", async () => {
      const handler = await registerAndGetHandler("idea.submitted");

      ideaFindUnique.mockResolvedValue({
        id: "idea-1",
        title: "My Idea",
        campaignId: "campaign-1",
        contributorId: "user-1",
        campaign: { title: "Test Campaign" },
      });

      campaignMemberFindMany.mockResolvedValue([
        { userId: "manager-1" },
        { userId: "manager-2" },
      ]);

      notificationCreateMany.mockResolvedValue({ count: 2 });

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "user-1",
        timestamp: new Date().toISOString(),
      });

      expect(notificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "manager-1",
            type: "IDEA_SUBMITTED",
            entityType: "idea",
            entityId: "idea-1",
          }),
          expect.objectContaining({
            userId: "manager-2",
            type: "IDEA_SUBMITTED",
          }),
        ]),
      });
    });

    it("excludes the actor from notifications", async () => {
      const handler = await registerAndGetHandler("idea.submitted");

      ideaFindUnique.mockResolvedValue({
        id: "idea-1",
        title: "My Idea",
        campaignId: "campaign-1",
        contributorId: "manager-1",
        campaign: { title: "Test Campaign" },
      });

      campaignMemberFindMany.mockResolvedValue([
        { userId: "manager-1" }, // same as actor
      ]);

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "manager-1",
        timestamp: new Date().toISOString(),
      });

      // No notifications created since the only manager is the actor
      expect(notificationCreateMany).not.toHaveBeenCalled();
    });
  });

  describe("idea.statusChanged", () => {
    it("notifies idea contributor on status change", async () => {
      const handler = await registerAndGetHandler("idea.statusChanged");

      ideaFindUnique.mockResolvedValue({
        id: "idea-1",
        title: "My Idea",
        status: "COMMUNITY_DISCUSSION",
        contributorId: "user-1",
      });

      ideaFollowFindMany.mockResolvedValue([]);
      notificationCreateMany.mockResolvedValue({ count: 1 });

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "system",
        timestamp: new Date().toISOString(),
      });

      expect(notificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            type: "STATUS_CHANGE",
          }),
        ]),
      });
    });

    it("sends HOT_GRADUATION type when idea becomes HOT", async () => {
      const handler = await registerAndGetHandler("idea.statusChanged");

      ideaFindUnique.mockResolvedValue({
        id: "idea-1",
        title: "My Idea",
        status: "HOT",
        contributorId: "user-1",
      });

      ideaFollowFindMany.mockResolvedValue([{ userId: "follower-1" }]);
      notificationCreateMany.mockResolvedValue({ count: 2 });

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "system",
        timestamp: new Date().toISOString(),
      });

      expect(notificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            type: "HOT_GRADUATION",
          }),
          expect.objectContaining({
            userId: "follower-1",
            type: "HOT_GRADUATION",
          }),
        ]),
      });
    });
  });

  describe("campaign.phaseChanged", () => {
    it("notifies all campaign members", async () => {
      const handler = await registerAndGetHandler("campaign.phaseChanged");

      campaignFindUnique.mockResolvedValue({
        id: "campaign-1",
        title: "Test Campaign",
        status: "SUBMISSION",
      });

      campaignMemberFindMany.mockResolvedValue([
        { userId: "member-1" },
        { userId: "member-2" },
      ]);

      notificationCreateMany.mockResolvedValue({ count: 2 });

      await handler({
        entity: "campaign",
        entityId: "campaign-1",
        actor: "admin-1",
        timestamp: new Date().toISOString(),
      });

      expect(notificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "member-1",
            type: "CAMPAIGN_PHASE_CHANGE",
          }),
          expect.objectContaining({
            userId: "member-2",
            type: "CAMPAIGN_PHASE_CHANGE",
          }),
        ]),
      });
    });
  });

  describe("comment.created", () => {
    it("notifies followers of the idea", async () => {
      const handler = await registerAndGetHandler("comment.created");

      ideaFollowFindMany.mockResolvedValue([
        { userId: "follower-1" },
        { userId: "follower-2" },
      ]);

      ideaFindUnique.mockResolvedValue({
        id: "idea-1",
        title: "My Idea",
      });

      notificationCreateMany.mockResolvedValue({ count: 2 });

      await handler({
        entity: "comment",
        entityId: "comment-1",
        actor: "user-1",
        timestamp: new Date().toISOString(),
        metadata: { ideaId: "idea-1" },
      });

      expect(notificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "follower-1",
            type: "COMMENT_ON_FOLLOWED",
          }),
          expect.objectContaining({
            userId: "follower-2",
            type: "COMMENT_ON_FOLLOWED",
          }),
        ]),
      });
    });

    it("skips when no ideaId in metadata", async () => {
      const handler = await registerAndGetHandler("comment.created");

      await handler({
        entity: "comment",
        entityId: "comment-1",
        actor: "user-1",
        timestamp: new Date().toISOString(),
        metadata: {},
      });

      expect(notificationCreateMany).not.toHaveBeenCalled();
    });
  });
});
