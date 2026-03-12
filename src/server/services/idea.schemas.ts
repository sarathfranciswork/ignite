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
  isConfidential: z.boolean().optional(),
});

export const ideaSetConfidentialInput = z.object({
  id: z.string(),
  isConfidential: z.boolean(),
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

// ── Idea Transition Schemas ────────────────────────────────

export const ideaTransitionInput = z.object({
  id: z.string(),
  targetStatus: z.enum([
    "DRAFT",
    "QUALIFICATION",
    "COMMUNITY_DISCUSSION",
    "HOT",
    "EVALUATION",
    "SELECTED_IMPLEMENTATION",
    "IMPLEMENTED",
    "ARCHIVED",
  ]),
});

export const ideaGetTransitionsInput = z.object({
  id: z.string(),
});

export const ideaArchiveInput = z.object({
  id: z.string(),
  reason: z.string().min(1, "Archive reason is required").max(2000),
});

export const ideaUnarchiveInput = z.object({
  id: z.string(),
});

// ── Coach Qualification Schemas ────────────────────────────

export const coachQualificationDecision = z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]);

export const ideaCoachQualifyInput = z.object({
  id: z.string(),
  decision: coachQualificationDecision,
  feedback: z.string().min(1, "Feedback is required").max(5000),
});

export type IdeaCreateInput = z.infer<typeof ideaCreateInput>;
export type IdeaUpdateInput = z.infer<typeof ideaUpdateInput>;
export type IdeaListInput = z.infer<typeof ideaListInput>;
export type IdeaTransitionInput = z.infer<typeof ideaTransitionInput>;
export type IdeaArchiveInput = z.infer<typeof ideaArchiveInput>;
export type IdeaUnarchiveInput = z.infer<typeof ideaUnarchiveInput>;
export type IdeaSetConfidentialInput = z.infer<typeof ideaSetConfidentialInput>;
export type IdeaCoachQualifyInput = z.infer<typeof ideaCoachQualifyInput>;
export type CoachQualificationDecision = z.infer<typeof coachQualificationDecision>;

// ── Idea Board Schemas ─────────────────────────────────────

export const ideaBoardSortField = z.enum([
  "title",
  "status",
  "category",
  "likesCount",
  "commentsCount",
  "viewsCount",
  "createdAt",
  "updatedAt",
]);

export const ideaBoardListInput = z.object({
  campaignId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
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
  sortField: ideaBoardSortField.default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export type IdeaBoardListInput = z.infer<typeof ideaBoardListInput>;
export type IdeaBoardSortField = z.infer<typeof ideaBoardSortField>;

// ── Split / Merge / Bulk Schemas ────────────────────────────

export const ideaSplitInput = z.object({
  id: z.string(),
  newIdeas: z
    .array(
      z.object({
        title: z.string().min(1, "Title is required").max(200),
        teaser: z.string().max(1000).optional(),
        description: z.string().max(50000).optional(),
        category: z.string().max(200).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .min(2, "Split must produce at least 2 ideas")
    .max(10, "Split can produce at most 10 ideas"),
});

export const ideaMergeInput = z.object({
  targetIdeaId: z.string(),
  sourceIdeaIds: z.array(z.string()).min(1, "At least one source idea is required").max(20),
});

export const ideaBulkAssignBucketInput = z.object({
  ideaIds: z.array(z.string()).min(1).max(100),
  bucketId: z.string(),
});

export const ideaBulkArchiveInput = z.object({
  ideaIds: z.array(z.string()).min(1).max(100),
  reason: z.string().min(1, "Archive reason is required").max(2000),
});

export const ideaBulkExportInput = z.object({
  ideaIds: z.array(z.string()).min(1).max(500),
  campaignId: z.string(),
});

export const ideaMergeHistoryInput = z.object({
  ideaId: z.string(),
});

export type IdeaSplitInput = z.infer<typeof ideaSplitInput>;
export type IdeaMergeInput = z.infer<typeof ideaMergeInput>;
export type IdeaBulkAssignBucketInput = z.infer<typeof ideaBulkAssignBucketInput>;
export type IdeaBulkArchiveInput = z.infer<typeof ideaBulkArchiveInput>;
export type IdeaBulkExportInput = z.infer<typeof ideaBulkExportInput>;
