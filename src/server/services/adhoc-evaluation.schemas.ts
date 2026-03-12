import { z } from "zod";

// ── Ad-Hoc Evaluation Session Input Schemas ─────────────────

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
});

const itemInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
});

export const adhocEvaluationCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  type: z.enum(["SCORECARD", "PAIRWISE"]),
  dueDate: z.string().datetime().optional(),
  criteria: z.array(criterionInput).min(1, "At least one criterion is required"),
  items: z.array(itemInput).optional(),
  evaluatorIds: z.array(z.string()).optional(),
});

export const adhocEvaluationUpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  criteria: z.array(criterionInput).min(1).optional(),
});

export const adhocEvaluationListInput = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

export const adhocEvaluationGetByIdInput = z.object({
  id: z.string(),
});

export const adhocEvaluationDeleteInput = z.object({
  id: z.string(),
});

export const adhocEvaluationActivateInput = z.object({
  id: z.string(),
});

export const adhocEvaluationCompleteInput = z.object({
  id: z.string(),
});

export const adhocAddItemsInput = z.object({
  sessionId: z.string(),
  items: z.array(itemInput).min(1),
});

// ── One-Team Evaluation Schemas ─────────────────────────────

export const oneTeamCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  campaignId: z.string().optional(),
  criteria: z.array(criterionInput).min(1, "At least one criterion is required"),
  evaluatorIds: z.array(z.string()).min(1, "At least one evaluator is required"),
  consensusRequired: z.boolean().default(false),
});

export const oneTeamStartSessionInput = z.object({
  id: z.string(),
});

export const oneTeamEndSessionInput = z.object({
  id: z.string(),
});

export const consensusNoteCreateInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
  content: z.string().min(1).max(5000),
});

export const consensusNoteListInput = z.object({
  sessionId: z.string(),
  ideaId: z.string(),
});

// ── Error Class ──────────────────────────────────────────────

export class AdhocEvaluationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AdhocEvaluationServiceError";
  }
}

// ── Type Exports ─────────────────────────────────────────────

export type AdhocEvaluationCreateInput = z.infer<typeof adhocEvaluationCreateInput>;
export type AdhocEvaluationUpdateInput = z.infer<typeof adhocEvaluationUpdateInput>;
export type AdhocEvaluationListInput = z.infer<typeof adhocEvaluationListInput>;
export type AdhocAddItemsInput = z.infer<typeof adhocAddItemsInput>;
export type OneTeamCreateInput = z.infer<typeof oneTeamCreateInput>;
export type ConsensusNoteCreateInput = z.infer<typeof consensusNoteCreateInput>;
export type ConsensusNoteListInput = z.infer<typeof consensusNoteListInput>;
