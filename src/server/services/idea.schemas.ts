import { z } from "zod";

// ── Idea Input Schemas ────────────────────────────────────

export const ideaCreateInput = z.object({
  campaignId: z.string(),
  title: z.string().min(1, "Title is required").max(200),
  teaser: z.string().max(1000).optional(),
  description: z.string().max(50000).optional(),
  category: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  isConfidential: z.boolean().optional(),
  inventionDisclosure: z.boolean().optional(),
  coAuthorIds: z.array(z.string()).optional(),
  submitImmediately: z.boolean().optional(),
});

export const ideaUpdateInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  teaser: z.string().max(1000).optional().nullable(),
  description: z.string().max(50000).optional().nullable(),
  category: z.string().max(200).optional().nullable(),
  tags: z.array(z.string()).optional(),
  isConfidential: z.boolean().optional(),
  inventionDisclosure: z.boolean().optional(),
  coAuthorIds: z.array(z.string()).optional(),
});

export const ideaListInput = z.object({
  campaignId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  status: z
    .enum([
      "DRAFT",
      "QUALIFICATION",
      "COMMUNITY_DISCUSSION",
      "HOT",
      "EVALUATION",
      "SELECTED_IMPLEMENTATION",
      "IMPLEMENTED",
      "ARCHIVED",
    ])
    .optional(),
  tag: z.string().max(50).optional(),
  category: z.string().max(200).optional(),
});

export const ideaGetByIdInput = z.object({
  id: z.string(),
});

export const ideaSubmitInput = z.object({
  id: z.string(),
});

export const ideaDeleteInput = z.object({
  id: z.string(),
});

export type IdeaCreateInput = z.infer<typeof ideaCreateInput>;
export type IdeaUpdateInput = z.infer<typeof ideaUpdateInput>;
export type IdeaListInput = z.infer<typeof ideaListInput>;
