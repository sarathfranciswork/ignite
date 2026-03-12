import { z } from "zod";

const conceptStatusEnum = z.enum(["ELABORATION", "EVALUATION", "APPROVED", "REJECTED"]);
const conceptDecisionEnum = z.enum(["APPROVE", "REJECT", "REVISE"]);
const conceptTeamRoleEnum = z.enum(["OWNER", "CONTRIBUTOR", "REVIEWER"]);
const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt", "status"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

export const conceptListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: conceptStatusEnum.optional(),
  ownerId: z.string().cuid().optional(),
  sortBy: sortFieldEnum.default("updatedAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const conceptCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional(),
  sourceIdeaId: z.string().cuid().optional(),
  ownerId: z.string().cuid().optional(),
});

export const conceptUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  problemStatement: z.string().max(50000).optional().nullable(),
  proposedSolution: z.string().max(50000).optional().nullable(),
  valueProposition: z.string().max(50000).optional().nullable(),
  swotStrengths: z.string().max(50000).optional().nullable(),
  swotWeaknesses: z.string().max(50000).optional().nullable(),
  swotOpportunities: z.string().max(50000).optional().nullable(),
  swotThreats: z.string().max(50000).optional().nullable(),
  targetMarket: z.string().max(50000).optional().nullable(),
  resourceRequirements: z.string().max(50000).optional().nullable(),
  expectedRoi: z.string().max(50000).optional().nullable(),
  riskAssessment: z.string().max(50000).optional().nullable(),
});

export const conceptGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const conceptDeleteInput = z.object({
  id: z.string().cuid(),
});

export const conceptTransitionInput = z.object({
  id: z.string().cuid(),
  targetStatus: conceptStatusEnum,
});

export const conceptSubmitDecisionInput = z.object({
  conceptId: z.string().cuid(),
  decision: conceptDecisionEnum,
  feedback: z.string().max(10000).optional(),
});

export const conceptAddTeamMemberInput = z.object({
  conceptId: z.string().cuid(),
  userId: z.string().cuid(),
  role: conceptTeamRoleEnum,
});

export const conceptRemoveTeamMemberInput = z.object({
  conceptId: z.string().cuid(),
  userId: z.string().cuid(),
});

export const conceptConvertToProjectInput = z.object({
  conceptId: z.string().cuid(),
  processDefinitionId: z.string().cuid(),
});

export type ConceptListInput = z.input<typeof conceptListInput>;
export type ConceptCreateInput = z.input<typeof conceptCreateInput>;
export type ConceptUpdateInput = z.infer<typeof conceptUpdateInput>;
export type ConceptGetByIdInput = z.infer<typeof conceptGetByIdInput>;
export type ConceptDeleteInput = z.infer<typeof conceptDeleteInput>;
export type ConceptTransitionInput = z.infer<typeof conceptTransitionInput>;
export type ConceptSubmitDecisionInput = z.infer<typeof conceptSubmitDecisionInput>;
export type ConceptAddTeamMemberInput = z.infer<typeof conceptAddTeamMemberInput>;
export type ConceptRemoveTeamMemberInput = z.infer<typeof conceptRemoveTeamMemberInput>;
export type ConceptConvertToProjectInput = z.infer<typeof conceptConvertToProjectInput>;
