import type { NotificationType } from "@prisma/client";

const APP_NAME = "Ignite";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background-color: #ffffff; border-radius: 8px; padding: 32px; margin-top: 20px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e4e4e7; margin-bottom: 20px; }
    .header h1 { color: #18181b; font-size: 24px; margin: 0; }
    .content { color: #3f3f46; font-size: 16px; line-height: 1.6; }
    .content h2 { color: #18181b; font-size: 20px; margin-top: 0; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
    .footer { text-align: center; padding-top: 20px; margin-top: 20px; color: #a1a1aa; font-size: 12px; }
    .notification-item { padding: 12px 0; border-bottom: 1px solid #f4f4f5; }
    .notification-item:last-child { border-bottom: none; }
    .notification-type { display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .notification-title { font-weight: 600; color: #18181b; margin: 4px 0; }
    .notification-body { color: #52525b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>${APP_NAME}</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>You received this email because of your notification preferences in ${APP_NAME}.</p>
        <p><a href="${APP_URL}/profile" style="color: #2563eb;">Manage preferences</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function typeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    IDEA_SUBMITTED: "New Idea",
    EVALUATION_REQUESTED: "Evaluation",
    STATUS_CHANGE: "Status Update",
    HOT_GRADUATION: "Hot Idea",
    CAMPAIGN_PHASE_CHANGE: "Campaign Update",
    COMMENT_ON_FOLLOWED: "New Comment",
    MENTION: "Mention",
  };
  return labels[type];
}

function entityUrl(entityType: string, entityId: string): string {
  const paths: Record<string, string> = {
    idea: `${APP_URL}/ideas/${entityId}`,
    campaign: `${APP_URL}/campaigns/${entityId}`,
    comment: `${APP_URL}/ideas/${entityId}`,
  };
  return paths[entityType] ?? APP_URL;
}

export interface NotificationEmailData {
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
}

export function renderImmediateEmail(
  recipientName: string,
  notification: NotificationEmailData,
): { subject: string; html: string; text: string } {
  const url = entityUrl(notification.entityType, notification.entityId);
  const subject = `[${APP_NAME}] ${notification.title}`;

  const html = baseLayout(`
    <h2>${notification.title}</h2>
    <p>${notification.body}</p>
    <p><a href="${url}" class="button">View Details</a></p>
  `);

  const text = `${notification.title}\n\n${notification.body}\n\nView details: ${url}`;

  return { subject, html, text };
}

export function renderDigestEmail(
  recipientName: string,
  notifications: NotificationEmailData[],
  frequency: "daily" | "weekly",
): { subject: string; html: string; text: string } {
  const period = frequency === "daily" ? "Daily" : "Weekly";
  const subject = `[${APP_NAME}] Your ${period} Notification Digest`;

  const notificationItems = notifications
    .map((n) => {
      const url = entityUrl(n.entityType, n.entityId);
      return `
      <div class="notification-item">
        <span class="notification-type">${typeLabel(n.type)}</span>
        <div class="notification-title"><a href="${url}" style="color: #18181b; text-decoration: none;">${n.title}</a></div>
        <div class="notification-body">${n.body}</div>
      </div>`;
    })
    .join("");

  const html = baseLayout(`
    <h2>Your ${period} Digest</h2>
    <p>Here are your ${notifications.length} notification${notifications.length !== 1 ? "s" : ""} from the past ${frequency === "daily" ? "24 hours" : "week"}:</p>
    ${notificationItems}
    <p style="margin-top: 20px;"><a href="${APP_URL}" class="button">Open ${APP_NAME}</a></p>
  `);

  const textItems = notifications
    .map((n) => `- [${typeLabel(n.type)}] ${n.title}: ${n.body}`)
    .join("\n");
  const text = `Your ${period} Digest\n\n${textItems}\n\nOpen ${APP_NAME}: ${APP_URL}`;

  return { subject, html, text };
}
