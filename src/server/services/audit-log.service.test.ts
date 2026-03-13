import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  createAuditLogEntry,
  listAuditLogs,
  getAuditLogById,
  exportAuditLogs,
  getAuditLogStats,
  getDistinctActions,
  getDistinctEntities,
  purgeOldAuditLogs,
  AuditLogServiceError,
} from "./audit-log.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
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

const { prisma } = await import("@/server/lib/prisma");

const auditLogCreate = prisma.auditLog.create as unknown as Mock;
const auditLogFindUnique = prisma.auditLog.findUnique as unknown as Mock;
const auditLogFindMany = prisma.auditLog.findMany as unknown as Mock;
const auditLogCount = prisma.auditLog.count as unknown as Mock;
const auditLogGroupBy = prisma.auditLog.groupBy as unknown as Mock;
const auditLogDeleteMany = prisma.auditLog.deleteMany as unknown as Mock;

const mockEntry = {
  id: "clx-audit-1",
  actorId: "user-1",
  actorEmail: "admin@example.com",
  action: "campaign.created",
  entity: "campaign",
  entityId: "campaign-1",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0",
  metadata: { eventEntity: "Campaign" },
  createdAt: new Date("2026-03-13T10:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAuditLogEntry", () => {
  it("creates an audit log entry successfully", async () => {
    auditLogCreate.mockResolvedValueOnce(mockEntry);

    await createAuditLogEntry({
      actorId: "user-1",
      actorEmail: "admin@example.com",
      action: "campaign.created",
      entity: "campaign",
      entityId: "campaign-1",
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      metadata: { eventEntity: "Campaign" },
    });

    expect(auditLogCreate).toHaveBeenCalledOnce();
    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "user-1",
        actorEmail: "admin@example.com",
        action: "campaign.created",
        entity: "campaign",
        entityId: "campaign-1",
      }),
    });
  });

  it("handles missing optional fields gracefully", async () => {
    auditLogCreate.mockResolvedValueOnce(mockEntry);

    await createAuditLogEntry({
      action: "system.startup",
      entity: "system",
    });

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        actorEmail: null,
        action: "system.startup",
        entity: "system",
        entityId: null,
        ipAddress: null,
        userAgent: null,
        metadata: undefined,
      }),
    });
  });

  it("does not throw on database errors", async () => {
    auditLogCreate.mockRejectedValueOnce(new Error("DB error"));

    await expect(createAuditLogEntry({ action: "test", entity: "test" })).resolves.toBeUndefined();
  });
});

describe("listAuditLogs", () => {
  it("returns paginated audit logs", async () => {
    auditLogFindMany.mockResolvedValueOnce([mockEntry]);

    const result = await listAuditLogs({ limit: 50 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeUndefined();
    expect(auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 51,
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("returns nextCursor when more items exist", async () => {
    const items = Array.from({ length: 3 }, (_, i) => ({
      ...mockEntry,
      id: `entry-${i}`,
    }));
    auditLogFindMany.mockResolvedValueOnce(items);

    const result = await listAuditLogs({ limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe("entry-2");
  });

  it("applies filters correctly", async () => {
    auditLogFindMany.mockResolvedValueOnce([]);

    await listAuditLogs({
      limit: 50,
      actorId: "user-1",
      action: "campaign.created",
      entity: "campaign",
    });

    expect(auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          actorId: "user-1",
          action: "campaign.created",
          entity: "campaign",
        }),
      }),
    );
  });

  it("applies search filter", async () => {
    auditLogFindMany.mockResolvedValueOnce([]);

    await listAuditLogs({ limit: 50, search: "campaign" });

    expect(auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ action: { contains: "campaign", mode: "insensitive" } }]),
        }),
      }),
    );
  });

  it("applies date range filters", async () => {
    auditLogFindMany.mockResolvedValueOnce([]);

    await listAuditLogs({
      limit: 50,
      startDate: "2026-03-01T00:00:00Z",
      endDate: "2026-03-31T23:59:59Z",
    });

    expect(auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date("2026-03-01T00:00:00Z"),
            lte: new Date("2026-03-31T23:59:59Z"),
          },
        }),
      }),
    );
  });

  it("supports cursor-based pagination", async () => {
    auditLogFindMany.mockResolvedValueOnce([mockEntry]);

    await listAuditLogs({ limit: 50, cursor: "clx-cursor" });

    expect(auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "clx-cursor" },
        skip: 1,
      }),
    );
  });
});

describe("getAuditLogById", () => {
  it("returns the audit log entry", async () => {
    auditLogFindUnique.mockResolvedValueOnce(mockEntry);

    const result = await getAuditLogById("clx-audit-1");

    expect(result).toEqual(mockEntry);
    expect(auditLogFindUnique).toHaveBeenCalledWith({
      where: { id: "clx-audit-1" },
    });
  });

  it("throws ENTRY_NOT_FOUND for missing entries", async () => {
    auditLogFindUnique.mockResolvedValueOnce(null);

    await expect(getAuditLogById("nonexistent")).rejects.toThrow(AuditLogServiceError);
    await expect(getAuditLogById("nonexistent")).rejects.toThrow("Audit log entry not found");
  });
});

describe("exportAuditLogs", () => {
  it("exports as CSV format", async () => {
    auditLogFindMany.mockResolvedValueOnce([mockEntry]);

    const result = await exportAuditLogs({ format: "csv" });

    expect(result.format).toBe("csv");
    expect(result.filename).toContain("audit-log-export-");
    expect(result.filename).toContain(".csv");
    expect(result.data).toContain("ID,Timestamp");
    expect(result.data).toContain("clx-audit-1");
  });

  it("exports as JSON format", async () => {
    auditLogFindMany.mockResolvedValueOnce([mockEntry]);

    const result = await exportAuditLogs({ format: "json" });

    expect(result.format).toBe("json");
    expect(result.filename).toContain(".json");
    const parsed = JSON.parse(result.data);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("clx-audit-1");
  });

  it("applies filters to export", async () => {
    auditLogFindMany.mockResolvedValueOnce([]);

    await exportAuditLogs({
      format: "csv",
      action: "campaign.created",
      entity: "campaign",
    });

    expect(auditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: "campaign.created",
          entity: "campaign",
        }),
      }),
    );
  });
});

describe("getAuditLogStats", () => {
  it("returns aggregated statistics", async () => {
    auditLogCount.mockResolvedValueOnce(100).mockResolvedValueOnce(15);
    auditLogFindMany.mockResolvedValueOnce([{ actorId: "user-1" }, { actorId: "user-2" }]);
    auditLogGroupBy.mockResolvedValueOnce([
      { action: "campaign.created", _count: { id: 25 } },
      { action: "idea.submitted", _count: { id: 20 } },
    ]);

    const result = await getAuditLogStats();

    expect(result.totalCount).toBe(100);
    expect(result.todayCount).toBe(15);
    expect(result.uniqueActorCount).toBe(2);
    expect(result.topActions).toHaveLength(2);
    expect(result.topActions[0]).toEqual({ action: "campaign.created", count: 25 });
  });
});

describe("getDistinctActions", () => {
  it("returns list of distinct action types", async () => {
    auditLogFindMany.mockResolvedValueOnce([
      { action: "campaign.created" },
      { action: "idea.submitted" },
    ]);

    const result = await getDistinctActions();

    expect(result).toEqual(["campaign.created", "idea.submitted"]);
  });
});

describe("getDistinctEntities", () => {
  it("returns list of distinct entity types", async () => {
    auditLogFindMany.mockResolvedValueOnce([{ entity: "campaign" }, { entity: "idea" }]);

    const result = await getDistinctEntities();

    expect(result).toEqual(["campaign", "idea"]);
  });
});

describe("purgeOldAuditLogs", () => {
  it("deletes entries older than retention period", async () => {
    auditLogDeleteMany.mockResolvedValueOnce({ count: 50 });

    const result = await purgeOldAuditLogs({ retentionDays: 90 });

    expect(result.deletedCount).toBe(50);
    expect(auditLogDeleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lt: expect.any(Date),
        },
      },
    });
  });
});
