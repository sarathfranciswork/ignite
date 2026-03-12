import { z } from "zod";

const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt", "status"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);
const projectStatusEnum = z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "TERMINATED"]);
const teamRoleEnum = z.enum(["LEADER", "MEMBER", "GATEKEEPER"]);

const teamMemberInput = z.object({
  userId: z.string().cuid(),
  role: teamRoleEnum,
});

export const projectListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: projectStatusEnum.optional(),
  sortBy: sortFieldEnum.default("updatedAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const projectCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional(),
  processDefinitionId: z.string().cuid(),
  teamMembers: z.array(teamMemberInput).default([]),
  sourceIdeaId: z.string().cuid().optional(),
});

export const projectUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
});

export const projectGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const projectDeleteInput = z.object({
  id: z.string().cuid(),
});

export const projectAddTeamMemberInput = z.object({
  projectId: z.string().cuid(),
  userId: z.string().cuid(),
  role: teamRoleEnum,
});

export const projectRemoveTeamMemberInput = z.object({
  projectId: z.string().cuid(),
  userId: z.string().cuid(),
});

export type ProjectListInput = z.input<typeof projectListInput>;
export type ProjectCreateInput = z.input<typeof projectCreateInput>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateInput>;
export type ProjectGetByIdInput = z.infer<typeof projectGetByIdInput>;
export type ProjectDeleteInput = z.infer<typeof projectDeleteInput>;
export const gateDecisionEnum = z.enum(["FORWARD", "REWORK", "POSTPONE", "TERMINATE"]);

export const requestGateReviewInput = z.object({
  projectId: z.string().cuid(),
});

export const submitGateDecisionInput = z.object({
  projectId: z.string().cuid(),
  phaseInstanceId: z.string().cuid(),
  decision: gateDecisionEnum,
  feedback: z.string().max(10000).optional(),
  postponeUntil: z.string().datetime().optional(),
});

export const getPhaseInstancesInput = z.object({
  projectId: z.string().cuid(),
});

export const updatePhaseDatesInput = z.object({
  phaseInstanceId: z.string().cuid(),
  plannedStartAt: z.string().datetime().optional().nullable(),
  plannedEndAt: z.string().datetime().optional().nullable(),
});

// ── Task Assignment Schemas ─────────────────────────────────

const projectTaskStatusEnum = z.enum(["TODO", "IN_PROGRESS", "COMPLETED"]);

export const listTaskAssignmentsInput = z.object({
  projectId: z.string().cuid(),
  phaseId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  status: projectTaskStatusEnum.optional(),
  activityId: z.string().cuid().optional(),
  mandatoryOnly: z.boolean().optional(),
  overdue: z.boolean().optional(),
});

export const getTaskAssignmentInput = z.object({
  projectId: z.string().cuid(),
  taskId: z.string().cuid(),
});

export const upsertTaskAssignmentInput = z.object({
  projectId: z.string().cuid(),
  taskId: z.string().cuid(),
  phaseId: z.string().cuid(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  textValue: z.string().max(50000).optional().nullable(),
  numberValue: z.number().optional().nullable(),
  dateValue: z.string().datetime().optional().nullable(),
  keywordValue: z.array(z.string().max(100)).max(50).optional(),
  fileUrl: z.string().max(2000).optional().nullable(),
  userValue: z.string().cuid().optional().nullable(),
});

export const updateTaskStatusInput = z.object({
  projectId: z.string().cuid(),
  taskId: z.string().cuid(),
  status: projectTaskStatusEnum,
});

export const listPhaseActivitiesInput = z.object({
  projectId: z.string().cuid(),
  phaseId: z.string().cuid(),
});

export type ProjectAddTeamMemberInput = z.infer<typeof projectAddTeamMemberInput>;
export type ProjectRemoveTeamMemberInput = z.infer<typeof projectRemoveTeamMemberInput>;
export type RequestGateReviewInput = z.infer<typeof requestGateReviewInput>;
export type SubmitGateDecisionInput = z.infer<typeof submitGateDecisionInput>;
export type GetPhaseInstancesInput = z.infer<typeof getPhaseInstancesInput>;
export type UpdatePhaseDatesInput = z.infer<typeof updatePhaseDatesInput>;
export type ListTaskAssignmentsInput = z.infer<typeof listTaskAssignmentsInput>;
export type GetTaskAssignmentInput = z.infer<typeof getTaskAssignmentInput>;
export type UpsertTaskAssignmentInput = z.infer<typeof upsertTaskAssignmentInput>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusInput>;
export type ListPhaseActivitiesInput = z.infer<typeof listPhaseActivitiesInput>;
