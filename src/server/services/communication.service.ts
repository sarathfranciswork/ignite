import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { sendEmail } from "@/server/lib/email";
import { wrapEmailWithTheme } from "@/server/services/email-theme.service";
import type {
  CampaignMessageCreateInput,
  CampaignMessageSendInput,
  CampaignMessageGetByIdInput,
  CampaignMessageListInput,
  CampaignMessageUpdateInput,
  CampaignMessageDeleteInput,
  CommunicationLogListInput,
  RecipientPreviewInput,
  AudienceSegmentValue,
} from "./communication.schemas";

export {
  campaignMessageCreateInput,
  campaignMessageSendInput,
  campaignMessageGetByIdInput,
  campaignMessageListInput,
  campaignMessageUpdateInput,
  campaignMessageDeleteInput,
  communicationLogListInput,
  recipientPreviewInput,
} from "./communication.schemas";

export type {
  CampaignMessageCreateInput,
  CampaignMessageSendInput,
  CampaignMessageGetByIdInput,
  CampaignMessageListInput,
  CampaignMessageUpdateInput,
  CampaignMessageDeleteInput,
  CommunicationLogListInput,
  RecipientPreviewInput,
} from "./communication.schemas";

const childLogger = logger.child({ service: "communication" });

export class CommunicationServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CommunicationServiceError";
  }
}

interface SerializedMessage {
  id: string;
  campaignId: string;
  subject: string;
  body: string;
  segment: string;
  status: string;
  sentAt: string | null;
  sentById: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  postToFeed: boolean;
  sendEmail: boolean;
  createdAt: string;
  updatedAt: string;
  sentBy?: { id: string; name: string | null; email: string; image: string | null };
}

function serializeMessage(message: {
  id: string;
  campaignId: string;
  subject: string;
  body: string;
  segment: string;
  status: string;
  sentAt: Date | null;
  sentById: string;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  postToFeed: boolean;
  sendEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
  sentBy?: { id: string; name: string | null; email: string; image: string | null };
}): SerializedMessage {
  return {
    id: message.id,
    campaignId: message.campaignId,
    subject: message.subject,
    body: message.body,
    segment: message.segment,
    status: message.status,
    sentAt: message.sentAt?.toISOString() ?? null,
    sentById: message.sentById,
    recipientCount: message.recipientCount,
    deliveredCount: message.deliveredCount,
    failedCount: message.failedCount,
    postToFeed: message.postToFeed,
    sendEmail: message.sendEmail,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    sentBy: message.sentBy,
  };
}

/**
 * Resolve recipients for a given campaign + audience segment.
 */
export async function resolveRecipients(
  campaignId: string,
  segment: AudienceSegmentValue,
): Promise<Array<{ id: string; email: string; name: string | null }>> {
  switch (segment) {
    case "ALL_MEMBERS": {
      const members = await prisma.campaignMember.findMany({
        where: { campaignId },
        include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
      });
      return members
        .filter((m) => m.user.isActive)
        .map((m) => ({ id: m.user.id, email: m.user.email, name: m.user.name }));
    }

    case "CONTRIBUTORS": {
      const ideas = await prisma.idea.findMany({
        where: { campaignId },
        select: { contributorId: true },
        distinct: ["contributorId"],
      });
      const contributorIds = ideas.map((i) => i.contributorId);
      const users = await prisma.user.findMany({
        where: { id: { in: contributorIds }, isActive: true },
        select: { id: true, email: true, name: true },
      });
      return users;
    }

    case "NON_CONTRIBUTORS": {
      const ideas = await prisma.idea.findMany({
        where: { campaignId },
        select: { contributorId: true },
        distinct: ["contributorId"],
      });
      const contributorIds = new Set(ideas.map((i) => i.contributorId));

      const members = await prisma.campaignMember.findMany({
        where: { campaignId },
        include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
      });
      return members
        .filter((m) => m.user.isActive && !contributorIds.has(m.user.id))
        .map((m) => ({ id: m.user.id, email: m.user.email, name: m.user.name }));
    }

    case "VIEWERS_NO_CONTRIBUTION": {
      // Members who have not submitted an idea or commented
      const ideas = await prisma.idea.findMany({
        where: { campaignId },
        select: { contributorId: true },
        distinct: ["contributorId"],
      });
      const comments = await prisma.comment.findMany({
        where: { idea: { campaignId } },
        select: { authorId: true },
        distinct: ["authorId"],
      });
      const activeIds = new Set([
        ...ideas.map((i) => i.contributorId),
        ...comments.map((c) => c.authorId),
      ]);

      const members = await prisma.campaignMember.findMany({
        where: { campaignId },
        include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
      });
      return members
        .filter((m) => m.user.isActive && !activeIds.has(m.user.id))
        .map((m) => ({ id: m.user.id, email: m.user.email, name: m.user.name }));
    }

    case "SELECTED_IDEA_AUTHORS": {
      const ideas = await prisma.idea.findMany({
        where: { campaignId, status: "SELECTED_IMPLEMENTATION" },
        select: { contributorId: true },
        distinct: ["contributorId"],
      });
      const userIds = ideas.map((i) => i.contributorId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: { id: true, email: true, name: true },
      });
      return users;
    }

    case "MANAGERS": {
      return resolveByRole(campaignId, "CAMPAIGN_MANAGER");
    }

    case "COACHES": {
      return resolveByRole(campaignId, "CAMPAIGN_COACH");
    }

    case "EVALUATORS": {
      return resolveByRole(campaignId, "CAMPAIGN_EVALUATOR");
    }

    case "SEEDERS": {
      return resolveByRole(campaignId, "CAMPAIGN_SEEDER");
    }

    case "SPONSORS": {
      return resolveByRole(campaignId, "CAMPAIGN_SPONSOR");
    }

    case "CUSTOM_ROLE": {
      // Fallback to all members for custom role (can be extended later)
      return resolveRecipients(campaignId, "ALL_MEMBERS");
    }

    default: {
      return [];
    }
  }
}

async function resolveByRole(
  campaignId: string,
  role: string,
): Promise<Array<{ id: string; email: string; name: string | null }>> {
  const members = await prisma.campaignMember.findMany({
    where: { campaignId, role: role as "CAMPAIGN_MANAGER" },
    include: { user: { select: { id: true, email: true, name: true, isActive: true } } },
  });
  return members
    .filter((m) => m.user.isActive)
    .map((m) => ({ id: m.user.id, email: m.user.email, name: m.user.name }));
}

/**
 * Preview recipients count and sample for a given segment.
 */
export async function previewRecipients(input: RecipientPreviewInput) {
  const recipients = await resolveRecipients(input.campaignId, input.segment);
  return {
    count: recipients.length,
    sample: recipients.slice(0, 10).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
    })),
  };
}

/**
 * Create a new campaign message (draft).
 */
export async function createCampaignMessage(input: CampaignMessageCreateInput, actorId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true },
  });

  if (!campaign) {
    throw new CommunicationServiceError("CAMPAIGN_NOT_FOUND", "Campaign not found");
  }

  const message = await prisma.campaignMessage.create({
    data: {
      campaignId: input.campaignId,
      subject: input.subject,
      body: input.body,
      segment: input.segment,
      postToFeed: input.postToFeed,
      sendEmail: input.sendEmail,
      sentById: actorId,
    },
    include: {
      sentBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  childLogger.info(
    { messageId: message.id, campaignId: input.campaignId },
    "Campaign message draft created",
  );

  eventBus.emit("communication.messageCreated", {
    entity: "campaignMessage",
    entityId: message.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { campaignId: input.campaignId, segment: input.segment },
  });

  return serializeMessage(message);
}

/**
 * Update a draft campaign message.
 */
export async function updateCampaignMessage(input: CampaignMessageUpdateInput, _actorId: string) {
  const existing = await prisma.campaignMessage.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new CommunicationServiceError("MESSAGE_NOT_FOUND", "Message not found");
  }

  if (existing.status !== "DRAFT") {
    throw new CommunicationServiceError("ALREADY_SENT", "Cannot update a sent message");
  }

  const message = await prisma.campaignMessage.update({
    where: { id: input.id },
    data: {
      ...(input.subject !== undefined ? { subject: input.subject } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.segment !== undefined ? { segment: input.segment } : {}),
      ...(input.postToFeed !== undefined ? { postToFeed: input.postToFeed } : {}),
      ...(input.sendEmail !== undefined ? { sendEmail: input.sendEmail } : {}),
    },
    include: {
      sentBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  childLogger.info({ messageId: message.id }, "Campaign message updated");

  return serializeMessage(message);
}

/**
 * Delete a draft campaign message.
 */
export async function deleteCampaignMessage(input: CampaignMessageDeleteInput, actorId: string) {
  const existing = await prisma.campaignMessage.findUnique({
    where: { id: input.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new CommunicationServiceError("MESSAGE_NOT_FOUND", "Message not found");
  }

  if (existing.status !== "DRAFT") {
    throw new CommunicationServiceError("ALREADY_SENT", "Cannot delete a sent message");
  }

  await prisma.campaignMessage.delete({ where: { id: input.id } });

  childLogger.info({ messageId: input.id, actorId }, "Campaign message deleted");

  return { success: true as const };
}

/**
 * Get a campaign message by ID.
 */
export async function getCampaignMessage(input: CampaignMessageGetByIdInput) {
  const message = await prisma.campaignMessage.findUnique({
    where: { id: input.id },
    include: {
      sentBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!message) {
    throw new CommunicationServiceError("MESSAGE_NOT_FOUND", "Message not found");
  }

  return serializeMessage(message);
}

/**
 * List campaign messages with cursor-based pagination.
 */
export async function listCampaignMessages(input: CampaignMessageListInput) {
  const { campaignId, cursor, limit, status } = input;

  const where: Record<string, unknown> = { campaignId };
  if (status) {
    where.status = status;
  }

  const messages = await prisma.campaignMessage.findMany({
    where,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      sentBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  let nextCursor: string | undefined;
  if (messages.length > limit) {
    const last = messages.pop();
    nextCursor = last?.id;
  }

  return {
    items: messages.map(serializeMessage),
    nextCursor,
  };
}

/**
 * Send a campaign message to the resolved audience segment.
 * Dispatches emails and/or activity feed posts, and logs each delivery.
 */
export async function sendCampaignMessage(input: CampaignMessageSendInput, actorId: string) {
  const message = await prisma.campaignMessage.findUnique({
    where: { id: input.id },
    include: {
      campaign: { select: { id: true, title: true } },
    },
  });

  if (!message) {
    throw new CommunicationServiceError("MESSAGE_NOT_FOUND", "Message not found");
  }

  if (message.status !== "DRAFT") {
    throw new CommunicationServiceError("ALREADY_SENT", "Message has already been sent");
  }

  const recipients = await resolveRecipients(
    message.campaignId,
    message.segment as AudienceSegmentValue,
  );

  // Mark as sent immediately
  await prisma.campaignMessage.update({
    where: { id: input.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      recipientCount: recipients.length,
    },
  });

  let deliveredCount = 0;
  let failedCount = 0;

  // Send emails and create communication logs
  for (const recipient of recipients) {
    if (message.sendEmail) {
      try {
        const themedHtml = await wrapEmailWithTheme(
          `<h2>${message.subject}</h2><div>${message.body}</div>`,
        );
        const sent = await sendEmail({
          to: recipient.email,
          subject: message.subject,
          html: themedHtml,
        });

        await prisma.communicationLog.create({
          data: {
            messageId: message.id,
            userId: recipient.id,
            channel: "EMAIL",
            status: sent ? "DELIVERED" : "FAILED",
            error: sent ? null : "Email delivery failed",
          },
        });

        if (sent) {
          deliveredCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await prisma.communicationLog.create({
          data: {
            messageId: message.id,
            userId: recipient.id,
            channel: "EMAIL",
            status: "FAILED",
            error: errorMessage,
          },
        });
        childLogger.error(
          { messageId: message.id, userId: recipient.id, error },
          "Failed to send email to recipient",
        );
      }
    }

    // Create in-app notification for each recipient
    await prisma.notification.create({
      data: {
        userId: recipient.id,
        type: "CAMPAIGN_PHASE_CHANGE",
        title: message.subject,
        body: message.body,
        entityType: "campaign",
        entityId: message.campaignId,
      },
    });

    await prisma.communicationLog.create({
      data: {
        messageId: message.id,
        userId: recipient.id,
        channel: "IN_APP",
        status: "DELIVERED",
      },
    });
  }

  // Post to campaign activity feed if enabled
  if (message.postToFeed) {
    await prisma.communicationLog.create({
      data: {
        messageId: message.id,
        userId: actorId,
        channel: "FEED",
        status: "DELIVERED",
      },
    });
  }

  // Update delivery stats
  const updatedMessage = await prisma.campaignMessage.update({
    where: { id: input.id },
    data: {
      deliveredCount,
      failedCount,
      status: failedCount > 0 && deliveredCount === 0 ? "FAILED" : "SENT",
    },
    include: {
      sentBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  childLogger.info(
    {
      messageId: message.id,
      campaignId: message.campaignId,
      recipientCount: recipients.length,
      deliveredCount,
      failedCount,
    },
    "Campaign message sent",
  );

  eventBus.emit("communication.messageSent", {
    entity: "campaignMessage",
    entityId: message.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      campaignId: message.campaignId,
      segment: message.segment,
      recipientCount: recipients.length,
      deliveredCount,
      failedCount,
    },
  });

  return serializeMessage(updatedMessage);
}

/**
 * List communication logs for a message.
 */
export async function listCommunicationLogs(input: CommunicationLogListInput) {
  const { messageId, cursor, limit } = input;

  const logs = await prisma.communicationLog.findMany({
    where: { messageId },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { sentAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (logs.length > limit) {
    const last = logs.pop();
    nextCursor = last?.id;
  }

  return {
    items: logs.map((log) => ({
      id: log.id,
      messageId: log.messageId,
      userId: log.userId,
      channel: log.channel,
      status: log.status,
      error: log.error,
      sentAt: log.sentAt.toISOString(),
    })),
    nextCursor,
  };
}
