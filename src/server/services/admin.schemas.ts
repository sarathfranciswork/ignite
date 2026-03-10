import { z } from "zod";

// ── User Admin Schemas ──────────────────────────────────────

export const userListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  role: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).optional(),
  orgUnitId: z.string().cuid().optional(),
});

export const userCreateInput = z.object({
  email: z.string().email("Invalid email address").max(255),
  name: z.string().min(1, "Name is required").max(100),
  globalRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).default("MEMBER"),
});

export const userUpdateInput = z.object({
  userId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  globalRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]).optional(),
  orgUnitIds: z.array(z.string().cuid()).optional(),
});

export const userToggleActiveInput = z.object({
  userId: z.string().cuid(),
  isActive: z.boolean(),
});

export const bulkAssignRoleInput = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
  globalRole: z.enum(["PLATFORM_ADMIN", "INNOVATION_MANAGER", "MEMBER"]),
});

export const bulkAssignOrgUnitInput = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
  orgUnitId: z.string().cuid(),
});

export const bulkDeactivateInput = z.object({
  userIds: z.array(z.string().cuid()).min(1).max(100),
});

export const userGetByIdInput = z.object({
  userId: z.string().cuid(),
});

export type UserListInput = z.infer<typeof userListInput>;
export type UserCreateInput = z.infer<typeof userCreateInput>;
export type UserUpdateInput = z.infer<typeof userUpdateInput>;

// ── Group Schemas ───────────────────────────────────────────

export const groupListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export const groupCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
});

export const groupUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const groupDeleteInput = z.object({
  id: z.string().cuid(),
});

export const groupGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const groupAddMemberInput = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const groupRemoveMemberInput = z.object({
  groupId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const groupAddMembersInput = z.object({
  groupId: z.string().cuid(),
  userIds: z.array(z.string().cuid()).min(1).max(100),
});

export type GroupListInput = z.infer<typeof groupListInput>;
export type GroupCreateInput = z.infer<typeof groupCreateInput>;
export type GroupUpdateInput = z.infer<typeof groupUpdateInput>;
