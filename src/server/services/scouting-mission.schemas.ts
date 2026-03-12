import { z } from "zod";

const sortDirectionEnum = z.enum(["asc", "desc"]);

const missionStatusEnum = z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]);

// ── Mission CRUD ─────────────────────────────────────────────

export const scoutingMissionListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: missionStatusEnum.optional(),
  sortBy: z.enum(["title", "deadline", "createdAt", "updatedAt"]).default("createdAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const scoutingMissionCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  problemStatement: z.string().min(1, "Problem statement is required").max(10000),
  requirements: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        priority: z.enum(["MUST_HAVE", "NICE_TO_HAVE"]).default("MUST_HAVE"),
      }),
    )
    .max(50)
    .optional(),
  targetIndustries: z.array(z.string().max(100)).max(20).default([]),
  targetRegions: z.array(z.string().max(100)).max(20).default([]),
  deadline: z.string().datetime().optional(),
  scoutIds: z.array(z.string().cuid()).max(50).default([]),
});

export const scoutingMissionUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  problemStatement: z.string().min(1).max(10000).optional(),
  requirements: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        priority: z.enum(["MUST_HAVE", "NICE_TO_HAVE"]).default("MUST_HAVE"),
      }),
    )
    .max(50)
    .optional()
    .nullable(),
  targetIndustries: z.array(z.string().max(100)).max(20).optional(),
  targetRegions: z.array(z.string().max(100)).max(20).optional(),
  deadline: z.string().datetime().optional().nullable(),
});

export const scoutingMissionGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const scoutingMissionDeleteInput = z.object({
  id: z.string().cuid(),
});

// ── Status Transitions ──────────────────────────────────────

export const scoutingMissionTransitionInput = z.object({
  id: z.string().cuid(),
  targetStatus: missionStatusEnum,
});

// ── Scout Management ────────────────────────────────────────

export const scoutingMissionAssignScoutsInput = z.object({
  missionId: z.string().cuid(),
  scoutIds: z.array(z.string().cuid()).min(1).max(50),
});

export const scoutingMissionRemoveScoutInput = z.object({
  missionId: z.string().cuid(),
  scoutId: z.string().cuid(),
});

// ── Types ────────────────────────────────────────────────────

export type ScoutingMissionListInput = z.input<typeof scoutingMissionListInput>;
export type ScoutingMissionCreateInput = z.infer<typeof scoutingMissionCreateInput>;
export type ScoutingMissionUpdateInput = z.infer<typeof scoutingMissionUpdateInput>;
export type ScoutingMissionTransitionInput = z.infer<typeof scoutingMissionTransitionInput>;
export type ScoutingMissionAssignScoutsInput = z.infer<typeof scoutingMissionAssignScoutsInput>;
export type ScoutingMissionRemoveScoutInput = z.infer<typeof scoutingMissionRemoveScoutInput>;
