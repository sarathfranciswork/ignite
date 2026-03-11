import { z } from "zod";

export const useCaseListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z
    .enum(["IDENTIFIED", "QUALIFICATION", "EVALUATION", "PILOT", "PARTNERSHIP", "ARCHIVED"])
    .optional(),
  ownerId: z.string().cuid().optional(),
});

export const useCaseCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  problemDescription: z
    .string()
    .max(5000, "Problem description must be 5000 characters or less")
    .optional(),
  suggestedSolution: z
    .string()
    .max(5000, "Suggested solution must be 5000 characters or less")
    .optional(),
  benefit: z.string().max(5000, "Benefit must be 5000 characters or less").optional(),
  organizationIds: z.array(z.string().cuid()).optional(),
});

export const useCaseUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  problemDescription: z.string().max(5000).optional().nullable(),
  suggestedSolution: z.string().max(5000).optional().nullable(),
  benefit: z.string().max(5000).optional().nullable(),
});

export const useCaseGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const useCaseDeleteInput = z.object({
  id: z.string().cuid(),
});

export const useCaseTransitionInput = z.object({
  id: z.string().cuid(),
  targetStatus: z.enum([
    "IDENTIFIED",
    "QUALIFICATION",
    "EVALUATION",
    "PILOT",
    "PARTNERSHIP",
    "ARCHIVED",
  ]),
});

export const useCaseTeamMemberInput = z.object({
  useCaseId: z.string().cuid(),
  userId: z.string().cuid(),
  role: z.enum(["LEAD", "MEMBER"]).default("MEMBER"),
});

export const useCaseTeamMemberRemoveInput = z.object({
  useCaseId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const useCaseOrganizationLinkInput = z.object({
  useCaseId: z.string().cuid(),
  organizationId: z.string().cuid(),
});

export const useCaseOrganizationUnlinkInput = z.object({
  useCaseId: z.string().cuid(),
  organizationId: z.string().cuid(),
});

export const useCaseTaskCreateInput = z.object({
  useCaseId: z.string().cuid(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]).default("OPEN"),
});

export const useCaseTaskUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const useCaseTaskDeleteInput = z.object({
  id: z.string().cuid(),
});

export const useCaseTaskListInput = z.object({
  useCaseId: z.string().cuid(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]).optional(),
});

export const useCaseFunnelInput = z.object({
  ownerId: z.string().cuid().optional(),
});

export type UseCaseListInput = z.infer<typeof useCaseListInput>;
export type UseCaseCreateInput = z.infer<typeof useCaseCreateInput>;
export type UseCaseUpdateInput = z.infer<typeof useCaseUpdateInput>;
export type UseCaseTransitionInput = z.infer<typeof useCaseTransitionInput>;
export type UseCaseTeamMemberInput = z.infer<typeof useCaseTeamMemberInput>;
export type UseCaseOrganizationLinkInput = z.infer<typeof useCaseOrganizationLinkInput>;
export type UseCaseTaskCreateInput = z.infer<typeof useCaseTaskCreateInput>;
export type UseCaseTaskUpdateInput = z.infer<typeof useCaseTaskUpdateInput>;
export type UseCaseTaskListInput = z.infer<typeof useCaseTaskListInput>;
export type UseCaseFunnelInput = z.infer<typeof useCaseFunnelInput>;
