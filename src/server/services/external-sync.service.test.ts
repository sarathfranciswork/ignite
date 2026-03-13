import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  configureSync,
  updateSync,
  deleteSync,
  getSyncById,
  listSyncConfigs,
  listSyncedItems,
  syncIdea,
  syncProject,
  updateSyncStatus,
  testConnection,
  resyncItem,
  ExternalSyncServiceError,
} from "./external-sync.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    externalSync: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    syncedItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    idea: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

// Mock the adapter modules
vi.mock("./adapters/jira.adapter", () => ({
  JiraAdapter: vi.fn().mockImplementation(() => ({
    createIssue: vi.fn().mockResolvedValue({
      externalId: "PROJ-123",
      externalUrl: "https://jira.example.com/browse/PROJ-123",
      status: "To Do",
    }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    getIssue: vi.fn().mockResolvedValue({
      externalId: "PROJ-123",
      externalUrl: "https://jira.example.com/browse/PROJ-123",
      status: "In Progress",
    }),
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      message: "Connected to Jira successfully",
    }),
  })),
}));

vi.mock("./adapters/azure-devops.adapter", () => ({
  AzureDevOpsAdapter: vi.fn().mockImplementation(() => ({
    createIssue: vi.fn().mockResolvedValue({
      externalId: "42",
      externalUrl: "https://dev.azure.com/org/proj/_workitems/edit/42",
      status: "New",
    }),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    getIssue: vi.fn().mockResolvedValue({
      externalId: "42",
      externalUrl: "https://dev.azure.com/org/proj/_workitems/edit/42",
      status: "Active",
    }),
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      message: "Connected to Azure DevOps successfully",
    }),
  })),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const syncCreate = prisma.externalSync.create as unknown as Mock;
const syncFindUnique = prisma.externalSync.findUnique as unknown as Mock;
const syncFindMany = prisma.externalSync.findMany as unknown as Mock;
const syncUpdate = prisma.externalSync.update as unknown as Mock;
const syncDelete = prisma.externalSync.delete as unknown as Mock;
const syncedItemCreate = prisma.syncedItem.create as unknown as Mock;
const syncedItemFindUnique = prisma.syncedItem.findUnique as unknown as Mock;
const syncedItemFindMany = prisma.syncedItem.findMany as unknown as Mock;
const syncedItemUpdate = prisma.syncedItem.update as unknown as Mock;
const ideaFindUnique = prisma.idea.findUnique as unknown as Mock;
const projectFindUnique = prisma.project.findUnique as unknown as Mock;
const mockEmit = eventBus.emit as unknown as Mock;

const mockSyncConfig = {
  id: "sync1",
  spaceId: "space1",
  provider: "JIRA" as const,
  baseUrl: "https://jira.example.com",
  apiToken: "token123",
  projectKey: "PROJ",
  isActive: true,
  fieldMappings: {},
  statusMappings: {},
  createdById: "user1",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: { id: "user1", name: "Test User", email: "test@test.com" },
  space: { id: "space1", name: "Test Space" },
};

const mockSyncedItem = {
  id: "item1",
  syncId: "sync1",
  entityType: "IDEA" as const,
  entityId: "idea1",
  externalId: "PROJ-123",
  externalUrl: "https://jira.example.com/browse/PROJ-123",
  lastSyncedAt: new Date(),
  syncStatus: "SYNCED" as const,
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("configureSync", () => {
  it("creates a sync configuration and emits event", async () => {
    syncCreate.mockResolvedValue(mockSyncConfig);

    const result = await configureSync(
      {
        spaceId: "space1",
        provider: "JIRA",
        baseUrl: "https://jira.example.com",
        apiToken: "token123",
        projectKey: "PROJ",
        fieldMappings: {},
        statusMappings: {},
      },
      "user1",
    );

    expect(result.id).toBe("sync1");
    expect(syncCreate).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      "externalSync.configured",
      expect.objectContaining({
        entity: "ExternalSync",
        entityId: "sync1",
        actor: "user1",
      }),
    );
  });
});

describe("updateSync", () => {
  it("updates an existing sync configuration", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);
    syncUpdate.mockResolvedValue({ ...mockSyncConfig, projectKey: "PROJ2" });

    const result = await updateSync({ id: "sync1", projectKey: "PROJ2" }, "user1");

    expect(result.projectKey).toBe("PROJ2");
    expect(syncUpdate).toHaveBeenCalledTimes(1);
  });

  it("throws NOT_FOUND when sync does not exist", async () => {
    syncFindUnique.mockResolvedValue(null);

    await expect(updateSync({ id: "nonexistent" }, "user1")).rejects.toThrow(
      ExternalSyncServiceError,
    );
  });
});

describe("syncIdea", () => {
  it("creates an external issue for an idea and records synced item", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);
    ideaFindUnique.mockResolvedValue({
      id: "idea1",
      title: "Great Idea",
      description: "Some description",
      status: "DRAFT",
    });
    syncedItemCreate.mockResolvedValue(mockSyncedItem);

    const result = await syncIdea({ syncId: "sync1", ideaId: "idea1" }, "user1");

    expect(result.id).toBe("item1");
    expect(syncedItemCreate).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      "externalSync.synced",
      expect.objectContaining({
        entity: "SyncedItem",
        entityId: "item1",
      }),
    );
  });

  it("throws when sync config not found", async () => {
    syncFindUnique.mockResolvedValue(null);

    await expect(syncIdea({ syncId: "bad", ideaId: "idea1" }, "user1")).rejects.toThrow(
      ExternalSyncServiceError,
    );
  });

  it("throws when sync config is inactive", async () => {
    syncFindUnique.mockResolvedValue({ ...mockSyncConfig, isActive: false });

    await expect(syncIdea({ syncId: "sync1", ideaId: "idea1" }, "user1")).rejects.toThrow(
      "inactive",
    );
  });

  it("throws when idea not found", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);
    ideaFindUnique.mockResolvedValue(null);

    await expect(syncIdea({ syncId: "sync1", ideaId: "bad" }, "user1")).rejects.toThrow(
      "not found",
    );
  });
});

describe("syncProject", () => {
  it("creates an external issue for a project", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);
    projectFindUnique.mockResolvedValue({
      id: "proj1",
      name: "My Project",
      description: "Description",
      status: "ACTIVE",
    });
    syncedItemCreate.mockResolvedValue({
      ...mockSyncedItem,
      entityType: "PROJECT",
      entityId: "proj1",
    });

    const result = await syncProject({ syncId: "sync1", projectId: "proj1" }, "user1");

    expect(result.entityType).toBe("PROJECT");
    expect(syncedItemCreate).toHaveBeenCalledTimes(1);
  });

  it("throws when project not found", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);
    projectFindUnique.mockResolvedValue(null);

    await expect(syncProject({ syncId: "sync1", projectId: "bad" }, "user1")).rejects.toThrow(
      "not found",
    );
  });
});

describe("updateSyncStatus", () => {
  it("updates sync status from webhook data", async () => {
    syncedItemFindUnique.mockResolvedValue({
      ...mockSyncedItem,
      sync: { ...mockSyncConfig, statusMappings: { "In Progress": "IN_PROGRESS" } },
    });
    syncedItemUpdate.mockResolvedValue({ ...mockSyncedItem, syncStatus: "SYNCED" });

    const result = await updateSyncStatus({
      syncedItemId: "item1",
      externalStatus: "In Progress",
    });

    expect(result.syncStatus).toBe("SYNCED");
    expect(mockEmit).toHaveBeenCalledWith(
      "externalSync.statusUpdated",
      expect.objectContaining({
        entity: "SyncedItem",
        entityId: "item1",
      }),
    );
  });

  it("throws when synced item not found", async () => {
    syncedItemFindUnique.mockResolvedValue(null);

    await expect(updateSyncStatus({ syncedItemId: "bad", externalStatus: "Done" })).rejects.toThrow(
      ExternalSyncServiceError,
    );
  });
});

describe("listSyncConfigs", () => {
  it("returns paginated sync configs", async () => {
    syncFindMany.mockResolvedValue([mockSyncConfig]);

    const result = await listSyncConfigs({ spaceId: "space1", limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns next cursor when more items exist", async () => {
    const configs = Array.from({ length: 3 }, (_, i) => ({
      ...mockSyncConfig,
      id: `sync${i}`,
    }));
    syncFindMany.mockResolvedValue(configs);

    const result = await listSyncConfigs({ spaceId: "space1", limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("sync2");
  });
});

describe("listSyncedItems", () => {
  it("returns paginated synced items", async () => {
    syncedItemFindMany.mockResolvedValue([mockSyncedItem]);

    const result = await listSyncedItems({ syncId: "sync1", limit: 20 });

    expect(result.items).toHaveLength(1);
  });
});

describe("deleteSync", () => {
  it("deletes a sync configuration", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);
    syncDelete.mockResolvedValue(mockSyncConfig);

    const result = await deleteSync("sync1", "user1");

    expect(result.success).toBe(true);
    expect(syncDelete).toHaveBeenCalledWith({ where: { id: "sync1" } });
  });

  it("throws when sync not found", async () => {
    syncFindUnique.mockResolvedValue(null);

    await expect(deleteSync("bad", "user1")).rejects.toThrow(ExternalSyncServiceError);
  });
});

describe("getSyncById", () => {
  it("returns sync config by id", async () => {
    syncFindUnique.mockResolvedValue(mockSyncConfig);

    const result = await getSyncById("sync1");

    expect(result.id).toBe("sync1");
  });

  it("throws when not found", async () => {
    syncFindUnique.mockResolvedValue(null);

    await expect(getSyncById("bad")).rejects.toThrow(ExternalSyncServiceError);
  });
});

describe("testConnection", () => {
  it("tests Jira connection successfully", async () => {
    const result = await testConnection({
      provider: "JIRA",
      baseUrl: "https://jira.example.com",
      apiToken: "token",
    });

    expect(result.success).toBe(true);
  });

  it("tests Azure DevOps connection successfully", async () => {
    const result = await testConnection({
      provider: "AZURE_DEVOPS",
      baseUrl: "https://dev.azure.com/org",
      apiToken: "token",
    });

    expect(result.success).toBe(true);
  });
});

describe("resyncItem", () => {
  it("re-syncs item successfully", async () => {
    syncedItemFindUnique.mockResolvedValue({
      ...mockSyncedItem,
      sync: mockSyncConfig,
    });
    syncedItemUpdate.mockResolvedValue({
      ...mockSyncedItem,
      syncStatus: "SYNCED",
    });

    const result = await resyncItem("item1", "user1");

    expect(result.syncStatus).toBe("SYNCED");
  });

  it("throws when item not found", async () => {
    syncedItemFindUnique.mockResolvedValue(null);

    await expect(resyncItem("bad", "user1")).rejects.toThrow(ExternalSyncServiceError);
  });
});
