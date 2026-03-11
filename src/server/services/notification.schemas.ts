import { z } from "zod";

export const notificationTypeEnum = z.enum([
  "IDEA_SUBMITTED",
  "EVALUATION_REQUESTED",
  "STATUS_CHANGE",
  "HOT_GRADUATION",
  "CAMPAIGN_PHASE_CHANGE",
  "COMMENT_ON_FOLLOWED",
  "MENTION",
]);

export const notificationListInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  type: notificationTypeEnum.optional(),
  unreadOnly: z.boolean().optional(),
});

export const notificationMarkReadInput = z.object({
  id: z.string(),
});

export const notificationCreateInput = z.object({
  userId: z.string(),
  type: notificationTypeEnum,
  title: z.string().min(1).max(255),
  body: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});

export type NotificationListInput = z.infer<typeof notificationListInput>;
export type NotificationMarkReadInput = z.infer<typeof notificationMarkReadInput>;
export type NotificationCreateInput = z.infer<typeof notificationCreateInput>;
