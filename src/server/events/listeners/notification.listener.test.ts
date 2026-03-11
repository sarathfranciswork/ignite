import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    idea: { findUnique: vi.fn() },
    campaign: { findUnique: vi.fn() },
    campaignMember: { findMany: vi.fn() },
    ideaFollow: { findMany: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn((calls: unknown[]) => Promise.all(calls)),
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

vi.mock("@/server/jobs/email-queue", () => ({
  enqueueEmail: vi.fn(),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const { enqueueEmail } = await import("@/server/jobs/email-queue");

const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const campaignMemberFindMany = prisma.campaignMember.findMany as unknown as Mock;
const ideaFollowFindMany = prisma.ideaFollow.findMany as unknown as Mock;
const mockTransaction = (prisma as unknown as { $transaction: Mock }).$transaction;
const mockEnqueueEmail = enqueueEmail as unknown as Mock;

const handlers = (
  eventBus as unknown as { _handlers: Record<string, ((...args: unknown[]) => Promise<void>)[]> }
)._handlers;

function setupTransactionMock(
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    entityType: string;
    entityId: string;
  }>,
) {
  mockTransaction.mockImplementation((calls: unknown[]) => {
    return Promise.resolve(notifications.slice(0, (calls as unknown[]).length));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(handlers)) {
    delete handlers[key];
  }
});

async function registerAndGetHandler(eventName: string) {
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

      campaignMemberFindMany.mockResolvedValue([{ userId: "manager-1" }, { userId: "manager-2" }]);

      setupTransactionMock([
        {
          id: "notif-1",
          userId: "manager-1",
          type: "IDEA_SUBMITTED",
          title: "New idea submitted",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
        {
          id: "notif-2",
          userId: "manager-2",
          type: "IDEA_SUBMITTED",
          title: "New idea submitted",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
      ]);

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "user-1",
        timestamp: new Date().toISOString(),
      });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockEnqueueEmail).toHaveBeenCalledTimes(2);
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

      campaignMemberFindMany.mockResolvedValue([{ userId: "manager-1" }]);

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "manager-1",
        timestamp: new Date().toISOString(),
      });

      expect(mockTransaction).not.toHaveBeenCalled();
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

      setupTransactionMock([
        {
          id: "notif-1",
          userId: "user-1",
          type: "STATUS_CHANGE",
          title: "Idea status changed",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
      ]);

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "system",
        timestamp: new Date().toISOString(),
      });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockEnqueueEmail).toHaveBeenCalledTimes(1);
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

      setupTransactionMock([
        {
          id: "notif-1",
          userId: "user-1",
          type: "HOT_GRADUATION",
          title: "Idea graduated to HOT",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
        {
          id: "notif-2",
          userId: "follower-1",
          type: "HOT_GRADUATION",
          title: "Idea graduated to HOT",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
      ]);

      await handler({
        entity: "idea",
        entityId: "idea-1",
        actor: "system",
        timestamp: new Date().toISOString(),
      });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockEnqueueEmail).toHaveBeenCalledTimes(2);
      expect(mockEnqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          type: "HOT_GRADUATION",
        }),
      );
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

      campaignMemberFindMany.mockResolvedValue([{ userId: "member-1" }, { userId: "member-2" }]);

      setupTransactionMock([
        {
          id: "notif-1",
          userId: "member-1",
          type: "CAMPAIGN_PHASE_CHANGE",
          title: "Campaign phase changed",
          body: "test",
          entityType: "campaign",
          entityId: "campaign-1",
        },
        {
          id: "notif-2",
          userId: "member-2",
          type: "CAMPAIGN_PHASE_CHANGE",
          title: "Campaign phase changed",
          body: "test",
          entityType: "campaign",
          entityId: "campaign-1",
        },
      ]);

      await handler({
        entity: "campaign",
        entityId: "campaign-1",
        actor: "admin-1",
        timestamp: new Date().toISOString(),
      });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockEnqueueEmail).toHaveBeenCalledTimes(2);
    });
  });

  describe("comment.created", () => {
    it("notifies followers of the idea", async () => {
      const handler = await registerAndGetHandler("comment.created");

      ideaFollowFindMany.mockResolvedValue([{ userId: "follower-1" }, { userId: "follower-2" }]);

      ideaFindUnique.mockResolvedValue({
        id: "idea-1",
        title: "My Idea",
      });

      setupTransactionMock([
        {
          id: "notif-1",
          userId: "follower-1",
          type: "COMMENT_ON_FOLLOWED",
          title: "New comment",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
        {
          id: "notif-2",
          userId: "follower-2",
          type: "COMMENT_ON_FOLLOWED",
          title: "New comment",
          body: "test",
          entityType: "idea",
          entityId: "idea-1",
        },
      ]);

      await handler({
        entity: "comment",
        entityId: "comment-1",
        actor: "user-1",
        timestamp: new Date().toISOString(),
        metadata: { ideaId: "idea-1" },
      });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockEnqueueEmail).toHaveBeenCalledTimes(2);
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

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockEnqueueEmail).not.toHaveBeenCalled();
    });
  });
});
