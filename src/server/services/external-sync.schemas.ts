import { z } from "zod";

export const externalSyncProviderEnum = z.enum(["JIRA", "AZURE_DEVOPS"]);
export const syncEntityTypeEnum = z.enum(["IDEA", "PROJECT"]);
export const syncStatusEnum = z.enum(["SYNCED", "PENDING", "ERROR"]);

export const externalSyncConfigureInput = z.object({
  spaceId: z.string().min(1),
  provider: externalSyncProviderEnum,
  baseUrl: z.string().url("Must be a valid URL"),
  apiToken: z.string().min(1, "API token is required"),
  projectKey: z.string().min(1, "Project key is required"),
  fieldMappings: z.record(z.string(), z.string()).default({}),
  statusMappings: z.record(z.string(), z.string()).default({}),
});

export const externalSyncUpdateInput = z.object({
  id: z.string().min(1),
  baseUrl: z.string().url().optional(),
  apiToken: z.string().min(1).optional(),
  projectKey: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
  statusMappings: z.record(z.string(), z.string()).optional(),
});

export const externalSyncByIdInput = z.object({
  id: z.string().min(1),
});

export const externalSyncListInput = z.object({
  spaceId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const syncIdeaInput = z.object({
  syncId: z.string().min(1),
  ideaId: z.string().min(1),
});

export const syncProjectInput = z.object({
  syncId: z.string().min(1),
  projectId: z.string().min(1),
});

export const syncedItemListInput = z.object({
  syncId: z.string().min(1),
  entityType: syncEntityTypeEnum.optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const testConnectionInput = z.object({
  provider: externalSyncProviderEnum,
  baseUrl: z.string().url(),
  apiToken: z.string().min(1),
});

export const updateSyncStatusInput = z.object({
  syncedItemId: z.string().min(1),
  externalStatus: z.string().min(1),
});

export type ExternalSyncConfigureInput = z.infer<typeof externalSyncConfigureInput>;
export type ExternalSyncUpdateInput = z.infer<typeof externalSyncUpdateInput>;
export type ExternalSyncListInput = z.infer<typeof externalSyncListInput>;
export type SyncIdeaInput = z.infer<typeof syncIdeaInput>;
export type SyncProjectInput = z.infer<typeof syncProjectInput>;
export type SyncedItemListInput = z.infer<typeof syncedItemListInput>;
export type TestConnectionInput = z.infer<typeof testConnectionInput>;
export type UpdateSyncStatusInput = z.infer<typeof updateSyncStatusInput>;
