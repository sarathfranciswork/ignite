import { z } from "zod";

// ── Variable Placeholders ──────────────────────────────────────
// Templates support {{variable}} placeholders that are replaced at send time.
// Available variables depend on notification type.

export const TEMPLATE_VARIABLES: Record<string, string[]> = {
  IDEA_SUBMITTED: ["ideaTitle", "campaignTitle", "authorName"],
  EVALUATION_REQUESTED: ["sessionTitle", "campaignTitle", "evaluatorName", "dueDate"],
  STATUS_CHANGE: ["entityTitle", "oldStatus", "newStatus", "changedBy"],
  HOT_GRADUATION: ["ideaTitle", "campaignTitle", "score"],
  CAMPAIGN_PHASE_CHANGE: ["campaignTitle", "oldPhase", "newPhase"],
  COMMENT_ON_FOLLOWED: ["ideaTitle", "commenterName", "commentPreview"],
  MENTION: ["mentionedBy", "entityTitle", "contextPreview"],
};

// ── Notification Type Values ───────────────────────────────────

export const notificationTypeValues = [
  "IDEA_SUBMITTED",
  "EVALUATION_REQUESTED",
  "STATUS_CHANGE",
  "HOT_GRADUATION",
  "CAMPAIGN_PHASE_CHANGE",
  "COMMENT_ON_FOLLOWED",
  "MENTION",
] as const;

export const notificationTypeEnum = z.enum(notificationTypeValues);

// ── Input Schemas ──────────────────────────────────────────────

export const notificationTemplateListInput = z.object({}).optional();

export const notificationTemplateGetInput = z.object({
  type: notificationTypeEnum,
});

export const notificationTemplateUpsertInput = z.object({
  type: notificationTypeEnum,
  emailSubject: z.string().min(1, "Email subject is required").max(500),
  emailBody: z.string().min(1, "Email body is required").max(10000),
  inAppTitle: z.string().min(1, "In-app title is required").max(200),
  inAppBody: z.string().min(1, "In-app body is required").max(2000),
  isActive: z.boolean().default(true),
});

export const notificationTemplateToggleInput = z.object({
  type: notificationTypeEnum,
  isActive: z.boolean(),
});

export const notificationTemplateResetInput = z.object({
  type: notificationTypeEnum,
});

export const notificationTemplatePreviewInput = z.object({
  type: notificationTypeEnum,
  channel: z.enum(["email", "inApp"]),
});

// ── Login Customization Schemas ────────────────────────────────

export const loginCustomizationUpdateInput = z.object({
  loginBannerUrl: z.string().url().max(500).optional().nullable(),
  loginWelcomeTitle: z.string().max(200).optional().nullable(),
  loginWelcomeMessage: z.string().max(1000).optional().nullable(),
});

export type LoginCustomizationUpdateInput = z.infer<typeof loginCustomizationUpdateInput>;
