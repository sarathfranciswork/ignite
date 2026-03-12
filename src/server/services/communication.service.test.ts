import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createCampaignMessage,
  updateCampaignMessage,
  deleteCampaignMessage,
  getCampaignMessage,
  listCampaignMessages,
  sendCampaignMessage,
  listCommunicationLogs,
  previewRecipients,
  resolveRecipients,
  CommunicationServiceError,
} from "./communication.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    campaignMessage: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    campaignMember: { findMany: vi.fn() },
    idea: { findMany: vi.fn() },
    comment: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { create: vi.fn() },
    communicationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
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

vi.mock("@/server/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/services/email-theme.service", () => ({
  wrapEmailWithTheme: vi.fn().mockResolvedValue("<html>themed</html>"),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const campaignFindUnique = prisma.campaign.findUnique as unknown as Mock;
const messageFindUnique = prisma.campaignMessage.findUnique as unknown as Mock;
const messageFindMany = prisma.campaignMessage.findMany as unknown as Mock;
const messageCreate = prisma.campaignMessage.create as unknown as Mock;
const messageUpdate = prisma.campaignMessage.update as unknown as Mock;
const messageDelete = prisma.campaignMessage.delete as unknown as Mock;
const memberFindMany = prisma.campaignMember.findMany as unknown as Mock;
const ideaFindMany = prisma.idea.findMany as unknown as Mock;
const commentFindMany = prisma.comment.findMany as unknown as Mock;
const userFindMany = prisma.user.findMany as unknown as Mock;
const logCreate = prisma.communicationLog.create as unknown as Mock;
const logFindMany = prisma.communicationLog.findMany as unknown as Mock;
const notificationCreate = prisma.notification.create as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const actorId = "actor-1";
const campaignId = "campaign-1";

const mockMessage = {
  id: "msg-1",
  campaignId,
  subject: "Test Subject",
  body: "Test body content",
  segment: "ALL_MEMBERS",
  status: "DRAFT",
  sentAt: null,
  sentById: actorId,
  recipientCount: 0,
  deliveredCount: 0,
  failedCount: 0,
  postToFeed: true,
  sendEmail: true,
  createdAt: new Date("2026-03-10T10:00:00Z"),
  updatedAt: new Date("2026-03-10T10:00:00Z"),
  sentBy: { id: actorId, name: "Actor", email: "actor@test.com", image: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createCampaignMessage", () => {
  it("creates a draft message", async () => {
    campaignFindUnique.mockResolvedValue({ id: campaignId });
    messageCreate.mockResolvedValue(mockMessage);

    const result = await createCampaignMessage(
      {
        campaignId,
        subject: "Test Subject",
        body: "Test body content",
        segment: "ALL_MEMBERS",
        postToFeed: true,
        sendEmail: true,
      },
      actorId,
    );

    expect(result.id).toBe("msg-1");
    expect(result.status).toBe("DRAFT");
    expect(result.subject).toBe("Test Subject");
    expect(messageCreate).toHaveBeenCalledOnce();
    expect(mockEmit).toHaveBeenCalledWith(
      "communication.messageCreated",
      expect.objectContaining({
        entity: "campaignMessage",
        entityId: "msg-1",
      }),
    );
  });

  it("throws if campaign not found", async () => {
    campaignFindUnique.mockResolvedValue(null);

    await expect(
      createCampaignMessage(
        {
          campaignId: "nonexistent",
          subject: "Test",
          body: "Body",
          segment: "ALL_MEMBERS",
          postToFeed: true,
          sendEmail: true,
        },
        actorId,
      ),
    ).rejects.toThrow(CommunicationServiceError);
  });
});

describe("updateCampaignMessage", () => {
  it("updates a draft message", async () => {
    messageFindUnique.mockResolvedValue({ id: "msg-1", status: "DRAFT" });
    messageUpdate.mockResolvedValue({ ...mockMessage, subject: "Updated Subject" });

    const result = await updateCampaignMessage(
      { id: "msg-1", subject: "Updated Subject" },
      actorId,
    );

    expect(result.subject).toBe("Updated Subject");
  });

  it("throws if message is already sent", async () => {
    messageFindUnique.mockResolvedValue({ id: "msg-1", status: "SENT" });

    await expect(
      updateCampaignMessage({ id: "msg-1", subject: "Updated" }, actorId),
    ).rejects.toThrow("Cannot update a sent message");
  });

  it("throws if message not found", async () => {
    messageFindUnique.mockResolvedValue(null);

    await expect(
      updateCampaignMessage({ id: "nonexistent", subject: "Updated" }, actorId),
    ).rejects.toThrow(CommunicationServiceError);
  });
});

describe("deleteCampaignMessage", () => {
  it("deletes a draft message", async () => {
    messageFindUnique.mockResolvedValue({ id: "msg-1", status: "DRAFT" });
    messageDelete.mockResolvedValue(mockMessage);

    const result = await deleteCampaignMessage({ id: "msg-1" }, actorId);

    expect(result.success).toBe(true);
    expect(messageDelete).toHaveBeenCalledWith({ where: { id: "msg-1" } });
  });

  it("throws if message is already sent", async () => {
    messageFindUnique.mockResolvedValue({ id: "msg-1", status: "SENT" });

    await expect(deleteCampaignMessage({ id: "msg-1" }, actorId)).rejects.toThrow(
      "Cannot delete a sent message",
    );
  });
});

describe("getCampaignMessage", () => {
  it("returns a message by ID", async () => {
    messageFindUnique.mockResolvedValue(mockMessage);

    const result = await getCampaignMessage({ id: "msg-1" });

    expect(result.id).toBe("msg-1");
    expect(result.createdAt).toBe("2026-03-10T10:00:00.000Z");
  });

  it("throws if message not found", async () => {
    messageFindUnique.mockResolvedValue(null);

    await expect(getCampaignMessage({ id: "nonexistent" })).rejects.toThrow(
      CommunicationServiceError,
    );
  });
});

describe("listCampaignMessages", () => {
  it("returns paginated messages", async () => {
    messageFindMany.mockResolvedValue([mockMessage]);

    const result = await listCampaignMessages({ campaignId, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns nextCursor when more items exist", async () => {
    const messages = Array.from({ length: 3 }, (_, i) => ({
      ...mockMessage,
      id: `msg-${i}`,
    }));
    messageFindMany.mockResolvedValue(messages);

    const result = await listCampaignMessages({ campaignId, limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("msg-2");
  });
});

describe("resolveRecipients", () => {
  it("resolves ALL_MEMBERS segment", async () => {
    memberFindMany.mockResolvedValue([
      { user: { id: "u1", email: "u1@test.com", name: "User 1", isActive: true } },
      { user: { id: "u2", email: "u2@test.com", name: "User 2", isActive: false } },
    ]);

    const recipients = await resolveRecipients(campaignId, "ALL_MEMBERS");

    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.id).toBe("u1");
  });

  it("resolves CONTRIBUTORS segment", async () => {
    ideaFindMany.mockResolvedValue([{ contributorId: "u1" }, { contributorId: "u2" }]);
    userFindMany.mockResolvedValue([
      { id: "u1", email: "u1@test.com", name: "User 1" },
      { id: "u2", email: "u2@test.com", name: "User 2" },
    ]);

    const recipients = await resolveRecipients(campaignId, "CONTRIBUTORS");

    expect(recipients).toHaveLength(2);
  });

  it("resolves NON_CONTRIBUTORS segment", async () => {
    ideaFindMany.mockResolvedValue([{ contributorId: "u1" }]);
    memberFindMany.mockResolvedValue([
      { user: { id: "u1", email: "u1@test.com", name: "User 1", isActive: true } },
      { user: { id: "u2", email: "u2@test.com", name: "User 2", isActive: true } },
    ]);

    const recipients = await resolveRecipients(campaignId, "NON_CONTRIBUTORS");

    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.id).toBe("u2");
  });

  it("resolves VIEWERS_NO_CONTRIBUTION segment", async () => {
    ideaFindMany.mockResolvedValue([{ contributorId: "u1" }]);
    commentFindMany.mockResolvedValue([{ authorId: "u2" }]);
    memberFindMany.mockResolvedValue([
      { user: { id: "u1", email: "u1@test.com", name: "User 1", isActive: true } },
      { user: { id: "u2", email: "u2@test.com", name: "User 2", isActive: true } },
      { user: { id: "u3", email: "u3@test.com", name: "User 3", isActive: true } },
    ]);

    const recipients = await resolveRecipients(campaignId, "VIEWERS_NO_CONTRIBUTION");

    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.id).toBe("u3");
  });

  it("resolves MANAGERS segment", async () => {
    memberFindMany.mockResolvedValue([
      { user: { id: "u1", email: "u1@test.com", name: "Manager", isActive: true } },
    ]);

    const recipients = await resolveRecipients(campaignId, "MANAGERS");

    expect(recipients).toHaveLength(1);
    expect(memberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId, role: "CAMPAIGN_MANAGER" },
      }),
    );
  });
});

describe("previewRecipients", () => {
  it("returns count and sample", async () => {
    memberFindMany.mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => ({
        user: {
          id: `u${i}`,
          email: `u${i}@test.com`,
          name: `User ${i}`,
          isActive: true,
        },
      })),
    );

    const result = await previewRecipients({ campaignId, segment: "ALL_MEMBERS" });

    expect(result.count).toBe(15);
    expect(result.sample).toHaveLength(10);
  });
});

describe("sendCampaignMessage", () => {
  it("sends a draft message", async () => {
    messageFindUnique.mockResolvedValue({
      ...mockMessage,
      campaign: { id: campaignId, title: "Test Campaign" },
    });
    memberFindMany.mockResolvedValue([
      { user: { id: "u1", email: "u1@test.com", name: "User 1", isActive: true } },
    ]);
    messageUpdate.mockResolvedValue({ ...mockMessage, status: "SENT", sentAt: new Date() });
    logCreate.mockResolvedValue({});
    notificationCreate.mockResolvedValue({});

    const result = await sendCampaignMessage({ id: "msg-1" }, actorId);

    expect(result.status).toBe("SENT");
    expect(mockEmit).toHaveBeenCalledWith(
      "communication.messageSent",
      expect.objectContaining({ entity: "campaignMessage" }),
    );
  });

  it("throws if message is already sent", async () => {
    messageFindUnique.mockResolvedValue({
      ...mockMessage,
      status: "SENT",
      campaign: { id: campaignId, title: "Test Campaign" },
    });

    await expect(sendCampaignMessage({ id: "msg-1" }, actorId)).rejects.toThrow(
      "Message has already been sent",
    );
  });

  it("throws if message not found", async () => {
    messageFindUnique.mockResolvedValue(null);

    await expect(sendCampaignMessage({ id: "nonexistent" }, actorId)).rejects.toThrow(
      CommunicationServiceError,
    );
  });
});

describe("listCommunicationLogs", () => {
  it("returns paginated logs", async () => {
    logFindMany.mockResolvedValue([
      {
        id: "log-1",
        messageId: "msg-1",
        userId: "u1",
        channel: "EMAIL",
        status: "DELIVERED",
        error: null,
        sentAt: new Date("2026-03-10T10:00:00Z"),
      },
    ]);

    const result = await listCommunicationLogs({ messageId: "msg-1", limit: 50 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.channel).toBe("EMAIL");
    expect(result.items[0]?.sentAt).toBe("2026-03-10T10:00:00.000Z");
  });
});
