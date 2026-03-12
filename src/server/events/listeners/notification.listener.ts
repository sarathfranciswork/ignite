import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { prisma } from "@/server/lib/prisma";
import { enqueueEmail } from "@/server/jobs/email-queue";
import { sendPushNotification } from "@/server/services/push.service";
import { resolveNotificationContent } from "@/server/services/notification-template.service";
import type { NotificationType } from "@prisma/client";

const childLogger = logger.child({ service: "notification-listener" });

const globalForListeners = globalThis as unknown as {
  notificationListenersRegistered: boolean | undefined;
};

interface NotificationTarget {
  userId: string;
  entityType: string;
  entityId: string;
}

function buildEntityUrl(entityType: string, entityId: string): string {
  const routeMap: Record<string, string> = {
    idea: "/ideas/",
    campaign: "/campaigns/",
    comment: "/ideas/",
  };
  const base = routeMap[entityType] ?? "/";
  return `${base}${entityId}`;
}

/**
 * Creates notifications using the template engine.
 * Resolves template content from DB (or defaults), checks isActive,
 * creates in-app notifications, and dispatches email + push.
 */
async function createNotificationsFromTemplate(
  type: NotificationType,
  variables: Record<string, string>,
  targets: NotificationTarget[],
) {
  if (targets.length === 0) return;

  try {
    const content = await resolveNotificationContent(type, variables);

    // Skip entirely if template is disabled
    if (!content.isActive) {
      childLogger.info({ type }, "Notification template disabled, skipping");
      return;
    }

    const created = await prisma.$transaction(
      targets.map((t) =>
        prisma.notification.create({
          data: {
            userId: t.userId,
            type,
            title: content.inAppTitle,
            body: content.inAppBody,
            entityType: t.entityType,
            entityId: t.entityId,
          },
        }),
      ),
    );

    childLogger.info({ count: targets.length, type }, "Notifications created via listener");

    // Dispatch email notifications (fire-and-forget)
    for (const notification of created) {
      enqueueEmail({
        notificationId: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: content.emailSubject,
        body: content.emailBody,
        entityType: notification.entityType,
        entityId: notification.entityId,
      });
    }

    // Dispatch push notifications (fire-and-forget)
    for (const notification of created) {
      const entityUrl = buildEntityUrl(notification.entityType, notification.entityId);
      void sendPushNotification({
        userId: notification.userId,
        title: content.inAppTitle,
        body: content.inAppBody,
        url: entityUrl,
        tag: notification.type,
        entityType: notification.entityType,
        entityId: notification.entityId,
      }).catch((pushError) => {
        childLogger.error(
          { userId: notification.userId, error: pushError },
          "Failed to send push notification",
        );
      });
    }
  } catch (error) {
    childLogger.error({ error, type }, "Failed to create notifications");
  }
}

async function getIdeaFollowers(ideaId: string, excludeUserId?: string): Promise<string[]> {
  const follows = await prisma.ideaFollow.findMany({
    where: { ideaId },
    select: { userId: true },
  });

  return follows.map((f) => f.userId).filter((uid) => uid !== excludeUserId);
}

export function registerNotificationListeners() {
  if (globalForListeners.notificationListenersRegistered) return;
  globalForListeners.notificationListenersRegistered = true;

  eventBus.on("idea.submitted", async (payload) => {
    const idea = await prisma.idea.findUnique({
      where: { id: payload.entityId },
      select: {
        id: true,
        title: true,
        campaignId: true,
        contributorId: true,
        campaign: { select: { title: true } },
      },
    });

    if (!idea) return;

    const managers = await prisma.campaignMember.findMany({
      where: {
        campaignId: idea.campaignId,
        role: { in: ["CAMPAIGN_MANAGER", "CAMPAIGN_COACH"] },
      },
      select: { userId: true },
    });

    const targets = managers
      .filter((m) => m.userId !== payload.actor)
      .map((m) => ({ userId: m.userId, entityType: "idea", entityId: idea.id }));

    await createNotificationsFromTemplate(
      "IDEA_SUBMITTED",
      {
        ideaTitle: idea.title,
        campaignTitle: idea.campaign.title,
      },
      targets,
    );
  });

  eventBus.on("idea.statusChanged", async (payload) => {
    const idea = await prisma.idea.findUnique({
      where: { id: payload.entityId },
      select: { id: true, title: true, status: true, contributorId: true },
    });

    if (!idea) return;

    const isHotGraduation = idea.status === "HOT";
    const type: NotificationType = isHotGraduation ? "HOT_GRADUATION" : "STATUS_CHANGE";

    const ownerTarget = { userId: idea.contributorId, entityType: "idea", entityId: idea.id };

    const followers = await getIdeaFollowers(idea.id, idea.contributorId);
    const followerTargets = followers.map((uid) => ({
      userId: uid,
      entityType: "idea",
      entityId: idea.id,
    }));

    await createNotificationsFromTemplate(
      type,
      {
        ideaTitle: idea.title,
        newStatus: idea.status,
      },
      [ownerTarget, ...followerTargets],
    );
  });

  eventBus.on("campaign.phaseChanged", async (payload) => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: payload.entityId },
      select: { id: true, title: true, status: true },
    });

    if (!campaign) return;

    const members = await prisma.campaignMember.findMany({
      where: { campaignId: campaign.id },
      select: { userId: true },
    });

    const uniqueUserIds = [...new Set(members.map((m) => m.userId))];

    const targets = uniqueUserIds
      .filter((uid) => uid !== payload.actor)
      .map((uid) => ({ userId: uid, entityType: "campaign", entityId: campaign.id }));

    await createNotificationsFromTemplate(
      "CAMPAIGN_PHASE_CHANGE",
      {
        campaignTitle: campaign.title,
        newPhase: campaign.status,
      },
      targets,
    );
  });

  eventBus.on("comment.created", async (payload) => {
    const ideaId = payload.metadata?.ideaId as string | undefined;
    if (!ideaId) return;

    const followers = await getIdeaFollowers(ideaId, payload.actor);
    if (followers.length === 0) return;

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, title: true },
    });

    if (!idea) return;

    const targets = followers.map((uid) => ({
      userId: uid,
      entityType: "idea",
      entityId: idea.id,
    }));

    await createNotificationsFromTemplate(
      "COMMENT_ON_FOLLOWED",
      {
        entityTitle: idea.title,
      },
      targets,
    );
  });

  eventBus.on("comment.mentioned", async (payload) => {
    const mentionedUserId = payload.metadata?.mentionedUserId as string | undefined;
    if (!mentionedUserId) return;

    const ideaId = payload.metadata?.ideaId as string | undefined;
    const idea = ideaId
      ? await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true, title: true } })
      : null;

    await createNotificationsFromTemplate(
      "MENTION",
      {
        entityTitle: idea?.title ?? "a discussion",
        mentionedBy: payload.actor,
      },
      [{ userId: mentionedUserId, entityType: "comment", entityId: payload.entityId }],
    );
  });

  eventBus.on("evaluation.completed", async (payload) => {
    const ideaId = payload.metadata?.ideaId as string | undefined;
    if (!ideaId) return;

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, title: true, contributorId: true },
    });

    if (!idea) return;

    await createNotificationsFromTemplate(
      "EVALUATION_REQUESTED",
      {
        ideaTitle: idea.title,
      },
      [{ userId: idea.contributorId, entityType: "idea", entityId: idea.id }],
    );
  });

  childLogger.info("Notification listeners registered");
}
