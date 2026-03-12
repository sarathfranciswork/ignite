import { z } from "zod";

// ── Evaluation Session Input Schemas ─────────────────────────

const criterionInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  guidanceText: z.string().max(2000).optional(),
  fieldType: z.enum(["SELECTION_SCALE", "TEXT", "CHECKBOX"]),
  weight: z.number().min(0).max(100).default(1.0),
  sortOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
  scaleMin: z.number().int().optional(),
  scaleMax: z.number().int().optional(),
  scaleLabels: z.record(z.string(), z.string()).optional(),
  visibleWhen: z
    .object({
      criterionId: z.string(),
      value: z.string(),
    })
    .optional(),
});

export const evaluationSessionCreateInput = z.object({
  campaignId: z.string(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["SCORECARD", "PAIRWISE"]),
  dueDate: z.string().datetime().optional(),
  isTemplate: z.boolean().default(false),
  templateId: z.string().optional(),
  criteria: z.array(criterionInput).min(1, "At least one criterion is required"),
});

export const evaluationSessionUpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  criteria: z.array(criterionInput).min(1).optional(),
});

export const evaluationSessionListInput = z.object({
  campaignId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  type: z.enum(["SCORECARD", "PAIRWISE"]).optional(),
  isTemplate: z.boolean().optional(),
});

export const evaluationSessionGetByIdInput = z.object({
  id: z.string(),
});

export const evaluationSessionDeleteInput = z.object({
  id: z.string(),
});

export const evaluationSessionActivateInput = z.object({
  id: z.string(),
});

export const evaluationSessionCompleteInput = z.object({
  id: z.string(),
});

// ── Evaluator Management ─────────────────────────────────────

export const evaluationAssignEvaluatorsInput = z.object({
  sessionId: z.string(),
  userIds: z.array(z.string()).min(1, "At least one evaluator is required"),
});

export const evaluationRemoveEvaluatorInput = z.object({
  sessionId: z.string(),
  userId: z.string(),
});

// ── Idea Management ──────────────────────────────────────────

export const evaluationAddIdeasInput = z.object({
  sessionId: z.string(),
  ideaIds: z.array(z.string()).min(1, "At least one idea is required"),
});

export const evaluationRemoveIdeaInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
});

export const evaluationAddIdeasFromBucketInput = z.object({
  sessionId: z.string(),
  bucketId: z.string(),
});

// ── Response Submission ──────────────────────────────────────

export const evaluationSubmitResponseInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
  responses: z.array(
    z.object({
      criterionId: z.string(),
      scoreValue: z.number().int().optional(),
      textValue: z.string().max(5000).optional(),
      boolValue: z.boolean().optional(),
    }),
  ),
});

// ── Progress & Results ───────────────────────────────────────

export const evaluationProgressInput = z.object({
  sessionId: z.string(),
});

export const evaluationResultsInput = z.object({
  sessionId: z.string(),
});

// ── Template ─────────────────────────────────────────────────

export const evaluationSaveAsTemplateInput = z.object({
  sessionId: z.string(),
  title: z.string().min(1).max(200),
});

export const evaluationListTemplatesInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// ── Error Class ──────────────────────────────────────────────

export class EvaluationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "EvaluationServiceError";
  }
}

// ── Type Exports ─────────────────────────────────────────────

export type EvaluationSessionCreateInput = z.infer<typeof evaluationSessionCreateInput>;
export type EvaluationSessionUpdateInput = z.infer<typeof evaluationSessionUpdateInput>;
export type EvaluationSessionListInput = z.infer<typeof evaluationSessionListInput>;
export type EvaluationAssignEvaluatorsInput = z.infer<typeof evaluationAssignEvaluatorsInput>;
export type EvaluationRemoveEvaluatorInput = z.infer<typeof evaluationRemoveEvaluatorInput>;
export type EvaluationAddIdeasInput = z.infer<typeof evaluationAddIdeasInput>;
export type EvaluationRemoveIdeaInput = z.infer<typeof evaluationRemoveIdeaInput>;
export type EvaluationAddIdeasFromBucketInput = z.infer<typeof evaluationAddIdeasFromBucketInput>;
export type EvaluationSubmitResponseInput = z.infer<typeof evaluationSubmitResponseInput>;
export type EvaluationProgressInput = z.infer<typeof evaluationProgressInput>;
export type EvaluationResultsInput = z.infer<typeof evaluationResultsInput>;
export type EvaluationSaveAsTemplateInput = z.infer<typeof evaluationSaveAsTemplateInput>;
export type EvaluationListTemplatesInput = z.infer<typeof evaluationListTemplatesInput>;
