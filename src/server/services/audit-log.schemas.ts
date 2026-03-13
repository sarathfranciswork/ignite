import { z } from "zod";

export const auditLogListInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  actorId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AuditLogListInput = z.infer<typeof auditLogListInput>;

export const auditLogGetByIdInput = z.object({
  id: z.string().min(1),
});

export type AuditLogGetByIdInput = z.infer<typeof auditLogGetByIdInput>;

export const auditLogExportInput = z.object({
  actorId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  entityId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(["csv", "json"]).optional(),
});

export type AuditLogExportInput = z.infer<typeof auditLogExportInput>;

export const auditLogRetentionInput = z.object({
  retentionDays: z.number().int().min(30).max(3650),
});

export type AuditLogRetentionInput = z.infer<typeof auditLogRetentionInput>;
