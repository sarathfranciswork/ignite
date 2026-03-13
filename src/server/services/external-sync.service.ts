import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  ExternalSyncConfigureInput,
  ExternalSyncUpdateInput,
  ExternalSyncListInput,
  SyncIdeaInput,
  SyncProjectInput,
  SyncedItemListInput,
  TestConnectionInput,
  UpdateSyncStatusInput,
} from "./external-sync.schemas";
import { JiraAdapter } from "./adapters/jira.adapter";
import { AzureDevOpsAdapter } from "./adapters/azure-devops.adapter";
import type { ExternalProviderAdapter } from "./adapters/external-provider.adapter";

const childLogger = logger.child({ service: "external-sync" });

export class ExternalSyncServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ExternalSyncServiceError";
  }
}

function getAdapter(
  provider: "JIRA" | "AZURE_DEVOPS",
  baseUrl: string,
  apiToken: string,
  projectKey: string,
): ExternalProviderAdapter {
  switch (provider) {
    case "JIRA":
      return new JiraAdapter(baseUrl, apiToken, projectKey);
    case "AZURE_DEVOPS":
      return new AzureDevOpsAdapter(baseUrl, apiToken, projectKey);
  }
}

export async function configureSync(input: ExternalSyncConfigureInput, userId: string) {
  const sync = await prisma.externalSync.create({
    data: {
      spaceId: input.spaceId,
      provider: input.provider,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      projectKey: input.projectKey,
      fieldMappings: input.fieldMappings,
      statusMappings: input.statusMappings,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      space: { select: { id: true, name: true } },
    },
  });

  childLogger.info(
    { syncId: sync.id, provider: sync.provider, userId },
    "External sync configured",
  );

  eventBus.emit("externalSync.configured", {
    entity: "ExternalSync",
    entityId: sync.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { provider: sync.provider, spaceId: sync.spaceId },
  });

  return sync;
}

export async function updateSync(input: ExternalSyncUpdateInput, userId: string) {
  const existing = await prisma.externalSync.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new ExternalSyncServiceError("Sync configuration not found", "NOT_FOUND");
  }

  const sync = await prisma.externalSync.update({
    where: { id: input.id },
    data: {
      ...(input.baseUrl !== undefined && { baseUrl: input.baseUrl }),
      ...(input.apiToken !== undefined && { apiToken: input.apiToken }),
      ...(input.projectKey !== undefined && { projectKey: input.projectKey }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.fieldMappings !== undefined && { fieldMappings: input.fieldMappings }),
      ...(input.statusMappings !== undefined && { statusMappings: input.statusMappings }),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      space: { select: { id: true, name: true } },
    },
  });

  childLogger.info({ syncId: sync.id, userId }, "External sync updated");

  return sync;
}

export async function syncIdea(input: SyncIdeaInput, userId: string) {
  const syncConfig = await prisma.externalSync.findUnique({ where: { id: input.syncId } });
  if (!syncConfig) {
    throw new ExternalSyncServiceError("Sync configuration not found", "NOT_FOUND");
  }
  if (!syncConfig.isActive) {
    throw new ExternalSyncServiceError("Sync configuration is inactive", "INACTIVE");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: input.ideaId },
    select: { id: true, title: true, description: true, status: true },
  });
  if (!idea) {
    throw new ExternalSyncServiceError("Idea not found", "NOT_FOUND");
  }

  const adapter = getAdapter(
    syncConfig.provider,
    syncConfig.baseUrl,
    syncConfig.apiToken,
    syncConfig.projectKey,
  );

  const fieldMappings = (syncConfig.fieldMappings ?? {}) as Record<string, string>;
  const fields: Record<string, unknown> = {};
  if (fieldMappings["issueType"]) {
    fields["issueType"] = fieldMappings["issueType"];
  }
  if (fieldMappings["workItemType"]) {
    fields["workItemType"] = fieldMappings["workItemType"];
  }

  const plainDescription =
    typeof idea.description === "string"
      ? idea.description
      : JSON.stringify(idea.description ?? "");

  const result = await adapter.createIssue({
    title: idea.title,
    description: plainDescription,
    fields,
  });

  const syncedItem = await prisma.syncedItem.create({
    data: {
      syncId: input.syncId,
      entityType: "IDEA",
      entityId: input.ideaId,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
    },
  });

  childLogger.info(
    { syncedItemId: syncedItem.id, externalId: result.externalId, ideaId: input.ideaId },
    "Idea synced to external system",
  );

  eventBus.emit("externalSync.synced", {
    entity: "SyncedItem",
    entityId: syncedItem.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      entityType: "IDEA",
      entityId: input.ideaId,
      externalId: result.externalId,
      provider: syncConfig.provider,
    },
  });

  return syncedItem;
}

export async function syncProject(input: SyncProjectInput, userId: string) {
  const syncConfig = await prisma.externalSync.findUnique({ where: { id: input.syncId } });
  if (!syncConfig) {
    throw new ExternalSyncServiceError("Sync configuration not found", "NOT_FOUND");
  }
  if (!syncConfig.isActive) {
    throw new ExternalSyncServiceError("Sync configuration is inactive", "INACTIVE");
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, title: true, description: true, status: true },
  });
  if (!project) {
    throw new ExternalSyncServiceError("Project not found", "NOT_FOUND");
  }

  const adapter = getAdapter(
    syncConfig.provider,
    syncConfig.baseUrl,
    syncConfig.apiToken,
    syncConfig.projectKey,
  );

  const fieldMappings = (syncConfig.fieldMappings ?? {}) as Record<string, string>;
  const fields: Record<string, unknown> = {};
  if (fieldMappings["issueType"]) {
    fields["issueType"] = fieldMappings["issueType"];
  }
  if (fieldMappings["workItemType"]) {
    fields["workItemType"] = fieldMappings["workItemType"];
  }

  const result = await adapter.createIssue({
    title: project.title,
    description: project.description ?? "",
    fields,
  });

  const syncedItem = await prisma.syncedItem.create({
    data: {
      syncId: input.syncId,
      entityType: "PROJECT",
      entityId: input.projectId,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
      lastSyncedAt: new Date(),
      syncStatus: "SYNCED",
    },
  });

  childLogger.info(
    { syncedItemId: syncedItem.id, externalId: result.externalId, projectId: input.projectId },
    "Project synced to external system",
  );

  eventBus.emit("externalSync.synced", {
    entity: "SyncedItem",
    entityId: syncedItem.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: {
      entityType: "PROJECT",
      entityId: input.projectId,
      externalId: result.externalId,
      provider: syncConfig.provider,
    },
  });

  return syncedItem;
}

export async function updateSyncStatus(input: UpdateSyncStatusInput) {
  const syncedItem = await prisma.syncedItem.findUnique({
    where: { id: input.syncedItemId },
    include: { sync: true },
  });
  if (!syncedItem) {
    throw new ExternalSyncServiceError("Synced item not found", "NOT_FOUND");
  }

  const statusMappings = (syncedItem.sync.statusMappings ?? {}) as Record<string, string>;
  const mappedStatus = statusMappings[input.externalStatus] ?? input.externalStatus;

  const updated = await prisma.syncedItem.update({
    where: { id: input.syncedItemId },
    data: {
      syncStatus: "SYNCED",
      lastSyncedAt: new Date(),
      errorMessage: null,
    },
  });

  childLogger.info(
    {
      syncedItemId: updated.id,
      externalStatus: input.externalStatus,
      mappedStatus,
    },
    "External sync status updated",
  );

  eventBus.emit("externalSync.statusUpdated", {
    entity: "SyncedItem",
    entityId: updated.id,
    actor: "system",
    timestamp: new Date().toISOString(),
    metadata: {
      externalStatus: input.externalStatus,
      mappedStatus,
      entityType: syncedItem.entityType,
      entityId: syncedItem.entityId,
    },
  });

  return updated;
}

export async function listSyncConfigs(input: ExternalSyncListInput) {
  const take = input.limit + 1;
  const items = await prisma.externalSync.findMany({
    where: { spaceId: input.spaceId },
    take,
    ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      space: { select: { id: true, name: true } },
      _count: { select: { syncedItems: true } },
    },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return { items, nextCursor };
}

export async function listSyncedItems(input: SyncedItemListInput) {
  const take = input.limit + 1;
  const items = await prisma.syncedItem.findMany({
    where: {
      syncId: input.syncId,
      ...(input.entityType && { entityType: input.entityType }),
    },
    take,
    ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
    orderBy: { lastSyncedAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const nextItem = items.pop();
    nextCursor = nextItem?.id;
  }

  return { items, nextCursor };
}

export async function deleteSync(id: string, userId: string) {
  const existing = await prisma.externalSync.findUnique({ where: { id } });
  if (!existing) {
    throw new ExternalSyncServiceError("Sync configuration not found", "NOT_FOUND");
  }

  await prisma.externalSync.delete({ where: { id } });

  childLogger.info({ syncId: id, userId }, "External sync deleted");

  return { success: true };
}

export async function testConnection(input: TestConnectionInput) {
  const adapter = getAdapter(input.provider, input.baseUrl, input.apiToken, "test");
  return adapter.testConnection();
}

export async function getSyncById(id: string) {
  const sync = await prisma.externalSync.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      space: { select: { id: true, name: true } },
      _count: { select: { syncedItems: true } },
    },
  });

  if (!sync) {
    throw new ExternalSyncServiceError("Sync configuration not found", "NOT_FOUND");
  }

  return sync;
}

export async function resyncItem(syncedItemId: string, userId: string) {
  const syncedItem = await prisma.syncedItem.findUnique({
    where: { id: syncedItemId },
    include: { sync: true },
  });
  if (!syncedItem) {
    throw new ExternalSyncServiceError("Synced item not found", "NOT_FOUND");
  }

  const adapter = getAdapter(
    syncedItem.sync.provider,
    syncedItem.sync.baseUrl,
    syncedItem.sync.apiToken,
    syncedItem.sync.projectKey,
  );

  try {
    const result = await adapter.getIssue(syncedItem.externalId);

    const updated = await prisma.syncedItem.update({
      where: { id: syncedItemId },
      data: {
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        errorMessage: null,
        externalUrl: result.externalUrl,
      },
    });

    childLogger.info({ syncedItemId, userId }, "Re-synced item successfully");
    return updated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown sync error";

    const updated = await prisma.syncedItem.update({
      where: { id: syncedItemId },
      data: {
        syncStatus: "ERROR",
        errorMessage,
      },
    });

    childLogger.error({ syncedItemId, error: errorMessage }, "Re-sync failed");
    return updated;
  }
}
