import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { sendEmail } from "@/server/lib/email";
import {
  renderImmediateEmail,
  renderDigestEmail,
  type NotificationEmailData,
} from "@/server/lib/email-templates";
import type { NotificationType } from "@prisma/client";

const childLogger = logger.child({ service: "email-job" });

export interface EmailJobPayload {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
}

export async function processEmailJob(payload: EmailJobPayload): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      notificationFrequency: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    childLogger.info({ userId: payload.userId }, "Skipping email — user inactive or not found");
    return false;
  }

  if (user.notificationFrequency !== "IMMEDIATE") {
    childLogger.debug(
      { userId: user.id, frequency: user.notificationFrequency },
      "Skipping immediate email — user prefers digest",
    );
    return false;
  }

  const notification: NotificationEmailData = {
    type: payload.type,
    title: payload.title,
    body: payload.body,
    entityType: payload.entityType,
    entityId: payload.entityId,
  };

  const { subject, html, text } = renderImmediateEmail(user.name ?? "User", notification);

  return sendEmail({
    to: user.email,
    subject,
    html,
    text,
  });
}

export async function processDigestJob(
  frequency: "DAILY" | "WEEKLY",
): Promise<{ usersProcessed: number; emailsSent: number }> {
  const now = new Date();
  const since = new Date(now);

  if (frequency === "DAILY") {
    since.setDate(since.getDate() - 1);
  } else {
    since.setDate(since.getDate() - 7);
  }

  const users = await prisma.user.findMany({
    where: {
      notificationFrequency: frequency,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  let emailsSent = 0;

  for (const user of users) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (notifications.length === 0) continue;

    const notificationData: NotificationEmailData[] = notifications.map((n) => ({
      type: n.type,
      title: n.title,
      body: n.body,
      entityType: n.entityType,
      entityId: n.entityId,
    }));

    const digestFrequency = frequency === "DAILY" ? "daily" : "weekly";
    const { subject, html, text } = renderDigestEmail(
      user.name ?? "User",
      notificationData,
      digestFrequency,
    );

    const sent = await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });

    if (sent) emailsSent++;
  }

  childLogger.info({ frequency, usersProcessed: users.length, emailsSent }, "Digest job completed");

  return { usersProcessed: users.length, emailsSent };
}
