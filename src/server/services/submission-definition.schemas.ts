import { z } from "zod";

// ── Submission Definition Schemas ───────────────────────────

const fieldInput = z.object({
  label: z.string().min(1).max(200),
  fieldKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z][a-zA-Z0-9_]*$/, "Field key must be camelCase"),
  fieldType: z.enum([
    "TEXT",
    "TEXTAREA",
    "NUMBER",
    "SELECT",
    "MULTI_SELECT",
    "DATE",
    "CHECKBOX",
    "FILE",
    "RICH_TEXT",
    "URL",
  ]),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  placeholder: z.string().max(500).optional(),
  helpText: z.string().max(2000).optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  validation: z
    .object({
      minLength: z.number().int().optional(),
      maxLength: z.number().int().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
});

export const submissionDefinitionCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, hyphenated"),
  campaignId: z.string().optional(),
  isGlobal: z.boolean().default(false),
  fields: z.array(fieldInput).min(1, "At least one field is required"),
});

export const submissionDefinitionUpdateInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  fields: z.array(fieldInput).min(1).optional(),
});

export const submissionDefinitionListInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  campaignId: z.string().optional(),
  isGlobal: z.boolean().optional(),
});

export const submissionDefinitionGetByIdInput = z.object({
  id: z.string(),
});

export const submissionDefinitionGetBySlugInput = z.object({
  slug: z.string(),
});

export const submissionDefinitionDeleteInput = z.object({
  id: z.string(),
});

export const submissionDefinitionActivateInput = z.object({
  id: z.string(),
});

export const submissionDefinitionArchiveInput = z.object({
  id: z.string(),
});

// ── Generic Submission Schemas ──────────────────────────────

const fieldValueInput = z.object({
  fieldId: z.string(),
  textValue: z.string().optional(),
  numberValue: z.number().optional(),
  boolValue: z.boolean().optional(),
  dateValue: z.string().datetime().optional(),
  jsonValue: z.unknown().optional(),
});

export const genericSubmissionCreateInput = z.object({
  definitionId: z.string(),
  title: z.string().min(1, "Title is required").max(200),
  fieldValues: z.array(fieldValueInput),
  submitImmediately: z.boolean().default(false),
});

export const genericSubmissionUpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  fieldValues: z.array(fieldValueInput).optional(),
});

export const genericSubmissionSubmitInput = z.object({
  id: z.string(),
});

export const genericSubmissionReviewInput = z.object({
  id: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(5000).optional(),
});

export const genericSubmissionListInput = z.object({
  definitionId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z
    .enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"])
    .optional(),
});

export const genericSubmissionGetByIdInput = z.object({
  id: z.string(),
});

export const genericSubmissionDeleteInput = z.object({
  id: z.string(),
});

// ── Error Class ──────────────────────────────────────────────

export class SubmissionServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SubmissionServiceError";
  }
}

// ── Type Exports ─────────────────────────────────────────────

export type SubmissionDefinitionCreateInput = z.infer<typeof submissionDefinitionCreateInput>;
export type SubmissionDefinitionUpdateInput = z.infer<typeof submissionDefinitionUpdateInput>;
export type SubmissionDefinitionListInput = z.infer<typeof submissionDefinitionListInput>;
export type GenericSubmissionCreateInput = z.infer<typeof genericSubmissionCreateInput>;
export type GenericSubmissionUpdateInput = z.infer<typeof genericSubmissionUpdateInput>;
export type GenericSubmissionReviewInput = z.infer<typeof genericSubmissionReviewInput>;
export type GenericSubmissionListInput = z.infer<typeof genericSubmissionListInput>;
