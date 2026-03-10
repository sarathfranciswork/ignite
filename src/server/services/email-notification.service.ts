import { getEmailQueue } from "../jobs/queues";
import { renderNotificationEmail } from "./email-renderer";
import { logger } from "../lib/logger";
import type { EmailJobPayload, NotificationData } from "../events/types";

interface UserWithPreferences {
  id: string;
  email: string;
  emailFrequency: "IMMEDIATELY" | "DAILY" | "WEEKLY" | "NEVER";
}

interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Handles email dispatch for a notification based on user preferences.
 * - IMMEDIATELY: queues the email right away via BullMQ
 * - DAILY/WEEKLY: no-op (handled by digest cron jobs)
 * - NEVER: no-op
 */
export async function dispatchNotificationEmail(
  user: UserWithPreferences,
  notification: NotificationRecord,
): Promise<void> {
  if (user.emailFrequency === "NEVER") {
    logger.debug("Email skipped: user preference is NEVER", {
      userId: user.id,
      notificationId: notification.id,
    });
    return;
  }

  if (user.emailFrequency !== "IMMEDIATELY") {
    logger.debug("Email deferred to digest", {
      userId: user.id,
      notificationId: notification.id,
      frequency: user.emailFrequency,
    });
    return;
  }

  const rendered = renderNotificationEmail({
    type: notification.type,
    title: notification.title,
    body: notification.body ?? undefined,
    link: notification.link ?? undefined,
    metadata: notification.metadata ?? undefined,
  });

  const payload: EmailJobPayload = {
    to: user.email,
    subject: rendered.subject,
    html: rendered.html,
    notificationId: notification.id,
  };

  const queue = getEmailQueue();
  await queue.add("send-notification", payload, {
    jobId: `email-${notification.id}`,
  });

  logger.info("Email job queued", {
    userId: user.id,
    notificationId: notification.id,
    to: user.email,
  });
}

/**
 * Queue an immediate email for a given notification.
 * Used by the notification service after creating a Notification record.
 */
export async function queueImmediateEmail(
  notificationData: NotificationData,
  notificationId: string,
  userEmail: string,
): Promise<void> {
  const rendered = renderNotificationEmail({
    type: notificationData.type,
    title: notificationData.title,
    body: notificationData.body,
    link: notificationData.link,
    metadata: notificationData.metadata,
  });

  const payload: EmailJobPayload = {
    to: userEmail,
    subject: rendered.subject,
    html: rendered.html,
    notificationId,
  };

  const queue = getEmailQueue();
  await queue.add("send-notification", payload, {
    jobId: `email-${notificationId}`,
  });
}
