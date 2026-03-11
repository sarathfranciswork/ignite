import { eventBus } from "@/server/events/event-bus";
import { logger } from "@/server/lib/logger";
import { prisma } from "@/server/lib/prisma";
import type { NotificationType } from "@prisma/client";

const childLogger = logger.child({ service: "notification-listener" });

const globalForListeners = globalThis as unknown as {
  notificationListenersRegistered: boolean | undefined;
};

interface NotificationTarget {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
}

async function createNotifications(targets: NotificationTarget[]) {
  if (targets.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: targets.map((t) => ({
        userId: t.userId,
        type: t.type,
        title: t.title,
        body: t.body,
        entityType: t.entityType,
        entityId: t.entityId,
      })),
    });

    childLogger.info({ count: targets.length }, "Notifications created via listener");
  } catch (error) {
    childLogger.error({ error }, "Failed to create notifications");
  }
}

async function getIdeaFollowers(ideaId: string, excludeUserId?: string): Promise<string[]> {
  const follows = await prisma.ideaFollow.findMany({
    where: { ideaId },
    select: { userId: true },
  });

  return follows
    .map((f) => f.userId)
    .filter((uid) => uid !== excludeUserId);
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

    const targets: NotificationTarget[] = managers
      .filter((m) => m.userId !== payload.actor)
      .map((m) => ({
        userId: m.userId,
        type: "IDEA_SUBMITTED" as NotificationType,
        title: "New idea submitted",
        body: `"${idea.title}" was submitted in campaign "${idea.campaign.title}"`,
        entityType: "idea",
        entityId: idea.id,
      }));

    await createNotifications(targets);
  });

  eventBus.on("idea.statusChanged", async (payload) => {
    const idea = await prisma.idea.findUnique({
      where: { id: payload.entityId },
      select: { id: true, title: true, status: true, contributorId: true },
    });

    if (!idea) return;

    const isHotGraduation = idea.status === "HOT";
    const type: NotificationType = isHotGraduation ? "HOT_GRADUATION" : "STATUS_CHANGE";
    const title = isHotGraduation ? "Idea graduated to HOT" : "Idea status changed";
    const body = isHotGraduation
      ? `Your idea "${idea.title}" has graduated to HOT status!`
      : `Your idea "${idea.title}" status changed to ${idea.status}`;

    const targets: NotificationTarget[] = [
      {
        userId: idea.contributorId,
        type,
        title,
        body,
        entityType: "idea",
        entityId: idea.id,
      },
    ];

    const followers = await getIdeaFollowers(idea.id, idea.contributorId);
    for (const followerId of followers) {
      targets.push({
        userId: followerId,
        type,
        title,
        body: isHotGraduation
          ? `"${idea.title}" (followed) has graduated to HOT status!`
          : `"${idea.title}" (followed) status changed to ${idea.status}`,
        entityType: "idea",
        entityId: idea.id,
      });
    }

    await createNotifications(targets);
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

    const targets: NotificationTarget[] = uniqueUserIds
      .filter((uid) => uid !== payload.actor)
      .map((uid) => ({
        userId: uid,
        type: "CAMPAIGN_PHASE_CHANGE" as NotificationType,
        title: "Campaign phase changed",
        body: `Campaign "${campaign.title}" moved to ${campaign.status} phase`,
        entityType: "campaign",
        entityId: campaign.id,
      }));

    await createNotifications(targets);
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

    const targets: NotificationTarget[] = followers.map((uid) => ({
      userId: uid,
      type: "COMMENT_ON_FOLLOWED" as NotificationType,
      title: "New comment on followed idea",
      body: `A new comment was posted on "${idea.title}"`,
      entityType: "idea",
      entityId: idea.id,
    }));

    await createNotifications(targets);
  });

  eventBus.on("comment.mentioned", async (payload) => {
    const mentionedUserId = payload.metadata?.mentionedUserId as string | undefined;
    if (!mentionedUserId) return;

    const ideaId = payload.metadata?.ideaId as string | undefined;
    const idea = ideaId
      ? await prisma.idea.findUnique({ where: { id: ideaId }, select: { id: true, title: true } })
      : null;

    const targets: NotificationTarget[] = [
      {
        userId: mentionedUserId,
        type: "MENTION" as NotificationType,
        title: "You were mentioned in a comment",
        body: idea
          ? `You were mentioned in a comment on "${idea.title}"`
          : "You were mentioned in a comment",
        entityType: "comment",
        entityId: payload.entityId,
      },
    ];

    await createNotifications(targets);
  });

  eventBus.on("evaluation.completed", async (payload) => {
    const ideaId = payload.metadata?.ideaId as string | undefined;
    if (!ideaId) return;

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, title: true, contributorId: true },
    });

    if (!idea) return;

    const targets: NotificationTarget[] = [
      {
        userId: idea.contributorId,
        type: "EVALUATION_REQUESTED" as NotificationType,
        title: "Evaluation completed",
        body: `An evaluation has been completed for your idea "${idea.title}"`,
        entityType: "idea",
        entityId: idea.id,
      },
    ];

    await createNotifications(targets);
  });

  childLogger.info("Notification listeners registered");
}
