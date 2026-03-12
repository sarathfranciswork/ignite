import { z } from "zod";

export const apiKeyCreateInput = z.object({
  name: z.string().min(1).max(200),
  scopes: z.array(z.string().min(1).max(100)).default([]),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateInput>;

export const apiKeyListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  isActive: z.boolean().optional(),
});

export type ApiKeyListInput = z.infer<typeof apiKeyListInput>;

export const apiKeyRevokeInput = z.object({
  id: z.string().cuid(),
});

export type ApiKeyRevokeInput = z.infer<typeof apiKeyRevokeInput>;

export const apiKeyDeleteInput = z.object({
  id: z.string().cuid(),
});

export type ApiKeyDeleteInput = z.infer<typeof apiKeyDeleteInput>;

export const apiKeyGetByIdInput = z.object({
  id: z.string().cuid(),
});

export type ApiKeyGetByIdInput = z.infer<typeof apiKeyGetByIdInput>;
