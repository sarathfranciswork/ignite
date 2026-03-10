export const NotificationType = {
  IDEA_SUBMITTED: "IDEA_SUBMITTED",
  IDEA_STATUS_CHANGED: "IDEA_STATUS_CHANGED",
  IDEA_HOT_GRADUATION: "IDEA_HOT_GRADUATION",
  COMMENT_ADDED: "COMMENT_ADDED",
  EVALUATION_REQUESTED: "EVALUATION_REQUESTED",
  EVALUATION_REMINDER: "EVALUATION_REMINDER",
  CAMPAIGN_PHASE_CHANGED: "CAMPAIGN_PHASE_CHANGED",
  MENTION: "MENTION",
  DRAFT_REMINDER: "DRAFT_REMINDER",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationCategory = {
  IDEAS: "IDEAS",
  CAMPAIGNS: "CAMPAIGNS",
  EVALUATIONS: "EVALUATIONS",
  MENTIONS: "MENTIONS",
} as const;

export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NOTIFICATION_CATEGORY_MAP: Record<
  NotificationType,
  NotificationCategory
> = {
  [NotificationType.IDEA_SUBMITTED]: NotificationCategory.IDEAS,
  [NotificationType.IDEA_STATUS_CHANGED]: NotificationCategory.IDEAS,
  [NotificationType.IDEA_HOT_GRADUATION]: NotificationCategory.IDEAS,
  [NotificationType.COMMENT_ADDED]: NotificationCategory.IDEAS,
  [NotificationType.EVALUATION_REQUESTED]: NotificationCategory.EVALUATIONS,
  [NotificationType.EVALUATION_REMINDER]: NotificationCategory.EVALUATIONS,
  [NotificationType.CAMPAIGN_PHASE_CHANGED]: NotificationCategory.CAMPAIGNS,
  [NotificationType.MENTION]: NotificationCategory.MENTIONS,
  [NotificationType.DRAFT_REMINDER]: NotificationCategory.IDEAS,
};

export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
  notificationId: string;
}

export interface DigestJobPayload {
  frequency: "DAILY" | "WEEKLY";
}

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}
