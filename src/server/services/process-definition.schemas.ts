import { z } from "zod";

const sortFieldEnum = z.enum(["name", "createdAt", "updatedAt"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);
const fieldTypeEnum = z.enum(["TEXT", "NUMBER", "KEYWORD", "ATTACHMENT", "DATE", "USER"]);

const taskInput = z.object({
  name: z.string().min(1, "Task name is required").max(200),
  fieldType: fieldTypeEnum,
  isMandatory: z.boolean().default(false),
  position: z.number().int().min(0),
});

const activityInput = z.object({
  name: z.string().min(1, "Activity name is required").max(200),
  description: z.string().max(5000).optional(),
  isMandatory: z.boolean().default(false),
  position: z.number().int().min(0),
  tasks: z.array(taskInput).default([]),
});

const phaseInput = z.object({
  name: z.string().min(1, "Phase name is required").max(200),
  description: z.string().max(5000).optional(),
  plannedDurationDays: z.number().int().min(1).optional().nullable(),
  position: z.number().int().min(0),
  activities: z.array(activityInput).default([]),
});

export const processDefinitionListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sortBy: sortFieldEnum.default("updatedAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const processDefinitionCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(10000).optional(),
  phases: z.array(phaseInput).default([]),
});

export const processDefinitionUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
});

export const processDefinitionGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const processDefinitionDeleteInput = z.object({
  id: z.string().cuid(),
});

export const processDefinitionDuplicateInput = z.object({
  id: z.string().cuid(),
});

export type ProcessDefinitionListInput = z.input<typeof processDefinitionListInput>;
export type ProcessDefinitionCreateInput = z.input<typeof processDefinitionCreateInput>;
export type ProcessDefinitionUpdateInput = z.infer<typeof processDefinitionUpdateInput>;
export type ProcessDefinitionGetByIdInput = z.infer<typeof processDefinitionGetByIdInput>;
export type ProcessDefinitionDeleteInput = z.infer<typeof processDefinitionDeleteInput>;
export type ProcessDefinitionDuplicateInput = z.infer<typeof processDefinitionDuplicateInput>;
