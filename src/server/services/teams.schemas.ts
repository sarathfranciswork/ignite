import { z } from "zod";

export const teamsWebhookUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .refine((url) => url.startsWith("https://"), "Teams webhook URL must use HTTPS");

export const teamsIntegrationCreateInput = z.object({
  name: z.string().min(1).max(200),
  webhookUrl: teamsWebhookUrlSchema,
  events: z.array(z.string()).min(1, "At least one event must be selected"),
  description: z.string().max(1000).optional(),
  campaignId: z.string().optional(),
  channelId: z.string().optional(),
});

export const teamsIntegrationUpdateInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  webhookUrl: teamsWebhookUrlSchema.optional(),
  events: z.array(z.string()).min(1).optional(),
  description: z.string().max(1000).optional(),
  campaignId: z.string().nullable().optional(),
  channelId: z.string().nullable().optional(),
});

export const teamsIntegrationListInput = z.object({
  campaignId: z.string().optional(),
  channelId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const teamsIntegrationByIdInput = z.object({
  id: z.string(),
});

export const teamsTestMessageInput = z.object({
  id: z.string(),
});

export type TeamsIntegrationCreateInput = z.infer<typeof teamsIntegrationCreateInput>;
export type TeamsIntegrationUpdateInput = z.infer<typeof teamsIntegrationUpdateInput>;
export type TeamsIntegrationListInput = z.infer<typeof teamsIntegrationListInput>;
export type TeamsIntegrationByIdInput = z.infer<typeof teamsIntegrationByIdInput>;
export type TeamsTestMessageInput = z.infer<typeof teamsTestMessageInput>;

/**
 * Adaptive Card types for Teams message formatting.
 */
export interface AdaptiveCardAction {
  type: "Action.OpenUrl";
  title: string;
  url: string;
}

export interface AdaptiveCardTextBlock {
  type: "TextBlock";
  text: string;
  weight?: "Bolder" | "Default" | "Lighter";
  size?: "Small" | "Default" | "Medium" | "Large" | "ExtraLarge";
  color?: "Default" | "Dark" | "Light" | "Accent" | "Good" | "Warning" | "Attention";
  wrap?: boolean;
  spacing?: "None" | "Small" | "Default" | "Medium" | "Large" | "ExtraLarge";
}

export interface AdaptiveCardColumnSet {
  type: "ColumnSet";
  columns: Array<{
    type: "Column";
    width: string;
    items: AdaptiveCardTextBlock[];
  }>;
}

export interface AdaptiveCard {
  type: "AdaptiveCard";
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json";
  version: "1.4";
  body: Array<AdaptiveCardTextBlock | AdaptiveCardColumnSet>;
  actions?: AdaptiveCardAction[];
}

/**
 * Teams webhook payload envelope.
 */
export interface TeamsWebhookPayload {
  type: "message";
  attachments: Array<{
    contentType: "application/vnd.microsoft.card.adaptive";
    contentUrl: null;
    content: AdaptiveCard;
  }>;
}

/**
 * Events available for Teams notification subscriptions.
 */
export const TEAMS_AVAILABLE_EVENTS = [
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

export type TeamsAvailableEvent = (typeof TEAMS_AVAILABLE_EVENTS)[number];
