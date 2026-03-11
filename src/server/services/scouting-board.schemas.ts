import { z } from "zod";

const columnTypeEnum = z.enum(["TEXT", "NUMBER", "SELECT", "DATE"]);

const shareRoleEnum = z.enum(["VIEWER", "EDITOR"]);

const sortDirectionEnum = z.enum(["asc", "desc"]);

// ── Board CRUD ───────────────────────────────────────────────

export const scoutingBoardListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  includeShared: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  sortBy: z.enum(["title", "createdAt", "updatedAt"]).default("updatedAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const scoutingBoardCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().max(20).optional(),
      }),
    )
    .min(1, "At least one column is required")
    .max(20)
    .optional(),
});

export const scoutingBoardUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
});

export const scoutingBoardGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const scoutingBoardDeleteInput = z.object({
  id: z.string().cuid(),
});

// ── Column Management ────────────────────────────────────────

export const scoutingBoardAddColumnInput = z.object({
  boardId: z.string().cuid(),
  name: z.string().min(1).max(100),
  type: columnTypeEnum.default("TEXT"),
  color: z.string().max(20).optional(),
});

export const scoutingBoardUpdateColumnInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional().nullable(),
});

export const scoutingBoardDeleteColumnInput = z.object({
  id: z.string().cuid(),
});

export const scoutingBoardReorderColumnsInput = z.object({
  boardId: z.string().cuid(),
  columnIds: z.array(z.string().cuid()).min(1),
});

// ── Card Management ──────────────────────────────────────────

export const scoutingBoardAddCardInput = z.object({
  boardId: z.string().cuid(),
  columnId: z.string().cuid(),
  organizationId: z.string().cuid(),
  notes: z.string().max(5000).optional(),
});

export const scoutingBoardUpdateCardInput = z.object({
  id: z.string().cuid(),
  notes: z.string().max(5000).optional().nullable(),
  customValues: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const scoutingBoardMoveCardInput = z.object({
  id: z.string().cuid(),
  columnId: z.string().cuid(),
  sortOrder: z.number().int().min(0),
});

export const scoutingBoardRemoveCardInput = z.object({
  id: z.string().cuid(),
});

export const scoutingBoardArchiveCardInput = z.object({
  id: z.string().cuid(),
  isArchived: z.boolean(),
});

export const scoutingBoardReorderCardsInput = z.object({
  boardId: z.string().cuid(),
  columnId: z.string().cuid(),
  cardIds: z.array(z.string().cuid()).min(1),
});

// ── Sharing ──────────────────────────────────────────────────

export const scoutingBoardShareInput = z.object({
  boardId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1).max(50),
  role: shareRoleEnum.default("VIEWER"),
});

export const scoutingBoardUnshareInput = z.object({
  boardId: z.string().cuid(),
  userId: z.string().cuid(),
});

// ── Types ────────────────────────────────────────────────────

export type ScoutingBoardListInput = z.input<typeof scoutingBoardListInput>;
export type ScoutingBoardCreateInput = z.infer<typeof scoutingBoardCreateInput>;
export type ScoutingBoardUpdateInput = z.infer<typeof scoutingBoardUpdateInput>;
export type ScoutingBoardAddColumnInput = z.infer<typeof scoutingBoardAddColumnInput>;
export type ScoutingBoardUpdateColumnInput = z.infer<typeof scoutingBoardUpdateColumnInput>;
export type ScoutingBoardReorderColumnsInput = z.infer<typeof scoutingBoardReorderColumnsInput>;
export type ScoutingBoardAddCardInput = z.infer<typeof scoutingBoardAddCardInput>;
export type ScoutingBoardUpdateCardInput = z.infer<typeof scoutingBoardUpdateCardInput>;
export type ScoutingBoardMoveCardInput = z.infer<typeof scoutingBoardMoveCardInput>;
export type ScoutingBoardReorderCardsInput = z.infer<typeof scoutingBoardReorderCardsInput>;
export type ScoutingBoardArchiveCardInput = z.infer<typeof scoutingBoardArchiveCardInput>;
export type ScoutingBoardShareInput = z.infer<typeof scoutingBoardShareInput>;
export type ScoutingBoardUnshareInput = z.infer<typeof scoutingBoardUnshareInput>;
