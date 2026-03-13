import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import type {
  AuditLogListInput,
  AuditLogExportInput,
  AuditLogRetentionInput,
} from "./audit-log.schemas";

export class AuditLogServiceError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuditLogServiceError";
  }
}

interface CreateAuditLogEntry {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildAuditLogWhereClause(input: {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (input.actorId) where.actorId = input.actorId;
  if (input.action) where.action = input.action;
  if (input.entity) where.entity = input.entity;
  if (input.entityId) where.entityId = input.entityId;

  if (input.search) {
    where.OR = [
      { action: { contains: input.search, mode: "insensitive" } },
      { entity: { contains: input.search, mode: "insensitive" } },
      { actorEmail: { contains: input.search, mode: "insensitive" } },
    ];
  }

  if (input.startDate || input.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (input.startDate) dateFilter.gte = new Date(input.startDate);
    if (input.endDate) dateFilter.lte = new Date(input.endDate);
    where.createdAt = dateFilter;
  }

  return where;
}

export async function createAuditLogEntry(entry: CreateAuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: (entry.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (error) {
    logger.error({ error, entry }, "Failed to create audit log entry");
  }
}

export async function listAuditLogs(input: AuditLogListInput) {
  const limit = input.limit ?? 50;
  const where = buildAuditLogWhereClause(input);

  const items = await prisma.auditLog.findMany({
    where,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const lastItem = items.pop();
    nextCursor = lastItem?.id;
  }

  return { items, nextCursor };
}

export async function getAuditLogById(id: string) {
  const entry = await prisma.auditLog.findUnique({
    where: { id },
  });

  if (!entry) {
    throw new AuditLogServiceError("ENTRY_NOT_FOUND", "Audit log entry not found");
  }

  return entry;
}

export async function exportAuditLogs(input: AuditLogExportInput) {
  const where = buildAuditLogWhereClause(input);

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const exportFormat = input.format ?? "csv";

  if (exportFormat === "json") {
    return {
      format: "json" as const,
      data: JSON.stringify(entries, null, 2),
      filename: `audit-log-export-${new Date().toISOString().slice(0, 10)}.json`,
    };
  }

  const csvHeaders = [
    "ID",
    "Timestamp",
    "Actor ID",
    "Actor Email",
    "Action",
    "Entity",
    "Entity ID",
    "IP Address",
  ];
  const csvRows = entries.map((entry) => [
    entry.id,
    entry.createdAt.toISOString(),
    entry.actorId ?? "",
    entry.actorEmail ?? "",
    entry.action,
    entry.entity,
    entry.entityId ?? "",
    entry.ipAddress ?? "",
  ]);

  const csvContent = [
    csvHeaders.map(escapeCsvField).join(","),
    ...csvRows.map((row) => row.map(escapeCsvField).join(",")),
  ].join("\n");

  return {
    format: "csv" as const,
    data: csvContent,
    filename: `audit-log-export-${new Date().toISOString().slice(0, 10)}.csv`,
  };
}

export async function getAuditLogStats() {
  const [totalCount, todayCount, uniqueActors, topActions] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.auditLog.findMany({
      select: { actorId: true },
      distinct: ["actorId"],
      where: { actorId: { not: null } },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  return {
    totalCount,
    todayCount,
    uniqueActorCount: uniqueActors.length,
    topActions: topActions.map((a) => ({
      action: a.action,
      count: a._count.id,
    })),
  };
}

export async function getDistinctActions() {
  const actions = await prisma.auditLog.findMany({
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });
  return actions.map((a) => a.action);
}

export async function getDistinctEntities() {
  const entities = await prisma.auditLog.findMany({
    select: { entity: true },
    distinct: ["entity"],
    orderBy: { entity: "asc" },
  });
  return entities.map((e) => e.entity);
}

export async function purgeOldAuditLogs(input: AuditLogRetentionInput) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - input.retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  logger.info(
    { deletedCount: result.count, retentionDays: input.retentionDays },
    "Purged old audit log entries",
  );

  return { deletedCount: result.count };
}
