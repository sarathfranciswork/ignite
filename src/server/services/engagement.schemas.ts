import { z } from "zod";

// ── Like Schemas ────────────────────────────────────────────

export const likeToggleInput = z.object({
  ideaId: z.string(),
});

export const likeStatusInput = z.object({
  ideaId: z.string(),
});

// ── Vote Schemas ────────────────────────────────────────────

export const voteUpsertInput = z.object({
  ideaId: z.string(),
  criterionId: z.string(),
  score: z.number().int().min(1).max(5),
});

export const voteDeleteInput = z.object({
  ideaId: z.string(),
  criterionId: z.string(),
});

export const voteGetInput = z.object({
  ideaId: z.string(),
});

// ── Follow Schemas ──────────────────────────────────────────

export const followToggleInput = z.object({
  ideaId: z.string(),
});

export const followStatusInput = z.object({
  ideaId: z.string(),
});

// ── Type Exports ────────────────────────────────────────────

export type LikeToggleInput = z.infer<typeof likeToggleInput>;
export type LikeStatusInput = z.infer<typeof likeStatusInput>;
export type VoteUpsertInput = z.infer<typeof voteUpsertInput>;
export type VoteDeleteInput = z.infer<typeof voteDeleteInput>;
export type VoteGetInput = z.infer<typeof voteGetInput>;
export type FollowToggleInput = z.infer<typeof followToggleInput>;
export type FollowStatusInput = z.infer<typeof followStatusInput>;
