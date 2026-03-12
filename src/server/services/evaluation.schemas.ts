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

// ── My Evaluations (Evaluator Dashboard) ────────────────────

export const evaluationMyPendingInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const evaluationMyResponsesInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
});

// ── Send Reminders ──────────────────────────────────────────

export const evaluationSendRemindersInput = z.object({
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

// ── Pairwise Evaluation ─────────────────────────────────────

export const pairwiseSubmitComparisonInput = z.object({
  sessionId: z.string(),
  ideaAId: z.string(),
  ideaBId: z.string(),
  comparisons: z.array(
    z.object({
      criterionId: z.string(),
      score: z.number().int().min(-5).max(5),
    }),
  ),
});

export const pairwiseGetNextPairInput = z.object({
  sessionId: z.string(),
});

export const pairwiseGetPairsInput = z.object({
  sessionId: z.string(),
});

export const pairwiseGetMyComparisonInput = z.object({
  sessionId: z.string(),
  ideaAId: z.string(),
  ideaBId: z.string(),
});

export const pairwiseProgressInput = z.object({
  sessionId: z.string(),
});

export const pairwiseResultsInput = z.object({
  sessionId: z.string(),
});

// ── Shortlist Management ────────────────────────────────

export const shortlistAddItemInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
});

export const shortlistRemoveItemInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
});

export const shortlistGetInput = z.object({
  sessionId: z.string(),
});

export const shortlistAddIdeasInput = z.object({
  sessionId: z.string(),
  ideaIds: z.array(z.string()).min(1, "At least one idea is required"),
});

export const shortlistRemoveIdeaInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
});

export const shortlistLockInput = z.object({
  sessionId: z.string(),
});

export const shortlistForwardInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
  destination: z.enum(["IMPLEMENTATION", "CONCEPT", "ARCHIVE"]),
});

export const shortlistForwardAllInput = z.object({
  sessionId: z.string(),
  target: z.enum(["SELECTED_IMPLEMENTATION", "CONCEPT", "ARCHIVED"]),
});

export const shortlistUpdateEntryInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
  rank: z.number().int().min(0).optional(),
  notes: z.string().max(5000).optional().nullable(),
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
export type EvaluationMyPendingInput = z.infer<typeof evaluationMyPendingInput>;
export type EvaluationMyResponsesInput = z.infer<typeof evaluationMyResponsesInput>;
export type EvaluationSendRemindersInput = z.infer<typeof evaluationSendRemindersInput>;
export type PairwiseSubmitComparisonInput = z.infer<typeof pairwiseSubmitComparisonInput>;
export type PairwiseGetNextPairInput = z.infer<typeof pairwiseGetNextPairInput>;
export type PairwiseGetPairsInput = z.infer<typeof pairwiseGetPairsInput>;
export type PairwiseGetMyComparisonInput = z.infer<typeof pairwiseGetMyComparisonInput>;
export type PairwiseProgressInput = z.infer<typeof pairwiseProgressInput>;
export type PairwiseResultsInput = z.infer<typeof pairwiseResultsInput>;
export type ShortlistAddItemInput = z.infer<typeof shortlistAddItemInput>;
export type ShortlistRemoveItemInput = z.infer<typeof shortlistRemoveItemInput>;
export type ShortlistLockInput = z.infer<typeof shortlistLockInput>;
export type ShortlistGetInput = z.infer<typeof shortlistGetInput>;
export type ShortlistForwardInput = z.infer<typeof shortlistForwardInput>;
export type ShortlistForwardAllInput = z.infer<typeof shortlistForwardAllInput>;
export type ShortlistAddIdeasInput = z.infer<typeof shortlistAddIdeasInput>;
export type ShortlistRemoveIdeaInput = z.infer<typeof shortlistRemoveIdeaInput>;
export type ShortlistUpdateEntryInput = z.infer<typeof shortlistUpdateEntryInput>;
