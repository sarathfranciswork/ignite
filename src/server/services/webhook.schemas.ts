import { z } from "zod";

export const webhookStatusEnum = z.enum(["ACTIVE", "PAUSED", "DISABLED"]);

export const webhookCreateInput = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  events: z.array(z.string().min(1).max(100)).min(1),
  description: z.string().max(2000).optional(),
});

export type WebhookCreateInput = z.infer<typeof webhookCreateInput>;

export const webhookUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().max(2000).optional(),
  events: z.array(z.string().min(1).max(100)).min(1).optional(),
  description: z.string().max(2000).optional(),
  status: webhookStatusEnum.optional(),
});

export type WebhookUpdateInput = z.infer<typeof webhookUpdateInput>;

export const webhookGetByIdInput = z.object({
  id: z.string().cuid(),
});

export type WebhookGetByIdInput = z.infer<typeof webhookGetByIdInput>;

export const webhookListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: webhookStatusEnum.optional(),
});

export type WebhookListInput = z.infer<typeof webhookListInput>;

export const webhookDeleteInput = z.object({
  id: z.string().cuid(),
});

export type WebhookDeleteInput = z.infer<typeof webhookDeleteInput>;

export const webhookRegenerateSecretInput = z.object({
  id: z.string().cuid(),
});

export type WebhookRegenerateSecretInput = z.infer<typeof webhookRegenerateSecretInput>;

export const webhookDeliveryListInput = z.object({
  webhookId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]).optional(),
});

export type WebhookDeliveryListInput = z.infer<typeof webhookDeliveryListInput>;

export const webhookTestInput = z.object({
  id: z.string().cuid(),
});

export type WebhookTestInput = z.infer<typeof webhookTestInput>;
