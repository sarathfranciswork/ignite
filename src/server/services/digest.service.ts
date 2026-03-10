import {
  NOTIFICATION_CATEGORY_MAP,
  NotificationCategory,
} from "../events/types";
import { renderDigestEmail } from "./email-renderer";
import { getEmailQueue } from "../jobs/queues";
import { logger } from "../lib/logger";
import type { DigestData } from "../templates/digest-templates";
import type { EmailJobPayload } from "../events/types";

interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
}

interface UserForDigest {
  id: string;
  email: string;
  firstName: string;
  emailFrequency: "DAILY" | "WEEKLY";
}

const CATEGORY_LABELS: Record<string, string> = {
  [NotificationCategory.CAMPAIGNS]: "Campaign Updates",
  [NotificationCategory.IDEAS]: "Your Ideas",
  [NotificationCategory.EVALUATIONS]: "Evaluation Tasks",
  [NotificationCategory.MENTIONS]: "Mentions",
};

function groupNotificationsByCategory(
  notifications: NotificationRecord[],
): DigestData["groups"] {
  const grouped = new Map<
    string,
    Array<{ title: string; body?: string; link?: string }>
  >();

  for (const notification of notifications) {
    const category =
      NOTIFICATION_CATEGORY_MAP[
        notification.type as keyof typeof NOTIFICATION_CATEGORY_MAP
      ] ?? NotificationCategory.IDEAS;

    const items = grouped.get(category) ?? [];
    items.push({
      title: notification.title,
      body: notification.body ?? undefined,
      link: notification.link ?? undefined,
    });
    grouped.set(category, items);
  }

  const groups: DigestData["groups"] = [];
  for (const [category, items] of grouped) {
    groups.push({
      label: CATEGORY_LABELS[category] ?? category,
      count: items.length,
      items,
    });
  }

  return groups.sort((a, b) => b.count - a.count);
}

function formatPeriod(frequency: "DAILY" | "WEEKLY"): string {
  const now = new Date();
  if (frequency === "DAILY") {
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const format: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  return `${weekAgo.toLocaleDateString("en-US", format)} – ${now.toLocaleDateString("en-US", format)}`;
}

/**
 * Build and queue a digest email for a user.
 * Returns true if an email was queued, false if no notifications to send.
 */
export async function buildAndQueueDigest(
  user: UserForDigest,
  notifications: NotificationRecord[],
): Promise<boolean> {
  if (notifications.length === 0) {
    logger.debug("No notifications for digest, skipping", {
      userId: user.id,
      frequency: user.emailFrequency,
    });
    return false;
  }

  const frequency = user.emailFrequency.toLowerCase() as "daily" | "weekly";
  const groups = groupNotificationsByCategory(notifications);
  const period = formatPeriod(user.emailFrequency);

  const digestData: DigestData = {
    userName: user.firstName,
    frequency,
    period,
    groups,
    totalCount: notifications.length,
  };

  const rendered = renderDigestEmail(digestData);

  const payload: EmailJobPayload = {
    to: user.email,
    subject: rendered.subject,
    html: rendered.html,
    notificationId: `digest-${user.id}-${Date.now()}`,
  };

  const queue = getEmailQueue();
  await queue.add("send-digest", payload, {
    jobId: `digest-${user.id}-${frequency}-${Date.now()}`,
  });

  logger.info("Digest email queued", {
    userId: user.id,
    frequency,
    notificationCount: notifications.length,
  });

  return true;
}

export { groupNotificationsByCategory, formatPeriod };
