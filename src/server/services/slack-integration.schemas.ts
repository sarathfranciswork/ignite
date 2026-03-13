import { z } from "zod";

export const slackWebhookUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .startsWith("https://", "Slack webhook URL must use HTTPS");

export const slackIntegrationCreateInput = z.object({
  name: z.string().min(1).max(200),
  webhookUrl: slackWebhookUrlSchema,
  events: z.array(z.string()).min(1, "At least one event must be selected"),
  description: z.string().max(1000).optional(),
  campaignId: z.string().optional(),
  channelId: z.string().optional(),
});

export const slackIntegrationUpdateInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  webhookUrl: slackWebhookUrlSchema.optional(),
  events: z.array(z.string()).min(1).optional(),
  description: z.string().max(1000).optional(),
  campaignId: z.string().nullable().optional(),
  channelId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const slackIntegrationListInput = z.object({
  campaignId: z.string().optional(),
  channelId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const slackIntegrationByIdInput = z.object({
  id: z.string(),
});

export const slackTestMessageInput = z.object({
  id: z.string(),
});

export type SlackIntegrationCreateInput = z.infer<typeof slackIntegrationCreateInput>;
export type SlackIntegrationUpdateInput = z.infer<typeof slackIntegrationUpdateInput>;
export type SlackIntegrationListInput = z.infer<typeof slackIntegrationListInput>;
export type SlackIntegrationByIdInput = z.infer<typeof slackIntegrationByIdInput>;
export type SlackTestMessageInput = z.infer<typeof slackTestMessageInput>;

/**
 * Slack Block Kit section block.
 */
export interface SlackBlockSection {
  type: "section";
  text: {
    type: "mrkdwn" | "plain_text";
    text: string;
  };
  fields?: Array<{
    type: "mrkdwn" | "plain_text";
    text: string;
  }>;
  accessory?: SlackBlockButton;
}

export interface SlackBlockButton {
  type: "button";
  text: {
    type: "plain_text";
    text: string;
  };
  url?: string;
  action_id?: string;
}

export interface SlackBlockDivider {
  type: "divider";
}

export interface SlackBlockContext {
  type: "context";
  elements: Array<{
    type: "mrkdwn" | "plain_text";
    text: string;
  }>;
}

export interface SlackBlockHeader {
  type: "header";
  text: {
    type: "plain_text";
    text: string;
  };
}

export type SlackBlock =
  | SlackBlockSection
  | SlackBlockDivider
  | SlackBlockContext
  | SlackBlockHeader;

/**
 * Slack incoming webhook payload.
 */
export interface SlackWebhookPayload {
  text: string;
  blocks?: SlackBlock[];
}

/**
 * Events available for Slack notification subscriptions.
 */
export const SLACK_AVAILABLE_EVENTS = [
  "campaign.created",
  "campaign.phaseChanged",
  "campaign.updated",
  "idea.created",
  "idea.submitted",
  "idea.statusChanged",
  "idea.transitioned",
  "idea.voted",
  "idea.liked",
  "comment.created",
  "evaluation.sessionCreated",
  "evaluation.sessionCompleted",
  "evaluation.completed",
  "organization.created",
  "organization.imported",
] as const;

export type SlackAvailableEvent = (typeof SLACK_AVAILABLE_EVENTS)[number];
