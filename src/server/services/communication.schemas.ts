import { z } from "zod";

export const audienceSegmentEnum = z.enum([
  "ALL_MEMBERS",
  "CONTRIBUTORS",
  "NON_CONTRIBUTORS",
  "VIEWERS_NO_CONTRIBUTION",
  "SELECTED_IDEA_AUTHORS",
  "MANAGERS",
  "COACHES",
  "EVALUATORS",
  "SEEDERS",
  "SPONSORS",
  "CUSTOM_ROLE",
]);

export type AudienceSegmentValue = z.infer<typeof audienceSegmentEnum>;

export const campaignMessageCreateInput = z.object({
  campaignId: z.string().cuid(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50000),
  segment: audienceSegmentEnum.default("ALL_MEMBERS"),
  postToFeed: z.boolean().default(true),
  sendEmail: z.boolean().default(true),
});

export type CampaignMessageCreateInput = z.infer<typeof campaignMessageCreateInput>;

export const campaignMessageSendInput = z.object({
  id: z.string().cuid(),
});

export type CampaignMessageSendInput = z.infer<typeof campaignMessageSendInput>;

export const campaignMessageGetByIdInput = z.object({
  id: z.string().cuid(),
});

export type CampaignMessageGetByIdInput = z.infer<typeof campaignMessageGetByIdInput>;

export const campaignMessageListInput = z.object({
  campaignId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "SENT", "FAILED"]).optional(),
});

export type CampaignMessageListInput = z.infer<typeof campaignMessageListInput>;

export const campaignMessageUpdateInput = z.object({
  id: z.string().cuid(),
  subject: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(50000).optional(),
  segment: audienceSegmentEnum.optional(),
  postToFeed: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
});

export type CampaignMessageUpdateInput = z.infer<typeof campaignMessageUpdateInput>;

export const campaignMessageDeleteInput = z.object({
  id: z.string().cuid(),
});

export type CampaignMessageDeleteInput = z.infer<typeof campaignMessageDeleteInput>;

export const communicationLogListInput = z.object({
  messageId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export type CommunicationLogListInput = z.infer<typeof communicationLogListInput>;

export const recipientPreviewInput = z.object({
  campaignId: z.string().cuid(),
  segment: audienceSegmentEnum,
});

export type RecipientPreviewInput = z.infer<typeof recipientPreviewInput>;
