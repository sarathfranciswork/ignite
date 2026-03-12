import { z } from "zod";

// ── Bucket Input Schemas ────────────────────────────────────

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const bucketCreateInput = z.object({
  campaignId: z.string(),
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().regex(hexColorRegex, "Must be a valid hex color").default("#6366F1"),
  type: z.enum(["MANUAL", "SMART"]).default("MANUAL"),
  description: z.string().max(2000).optional(),
  filterCriteria: z
    .object({
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
      minLikes: z.number().int().min(0).optional(),
      minComments: z.number().int().min(0).optional(),
      minViews: z.number().int().min(0).optional(),
      tag: z.string().max(50).optional(),
      category: z.string().max(200).optional(),
      search: z.string().max(200).optional(),
    })
    .optional(),
});

export const bucketUpdateInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(hexColorRegex, "Must be a valid hex color").optional(),
  description: z.string().max(2000).optional().nullable(),
  filterCriteria: z
    .object({
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
      minLikes: z.number().int().min(0).optional(),
      minComments: z.number().int().min(0).optional(),
      minViews: z.number().int().min(0).optional(),
      tag: z.string().max(50).optional(),
      category: z.string().max(200).optional(),
      search: z.string().max(200).optional(),
    })
    .optional()
    .nullable(),
});

export const bucketListInput = z.object({
  campaignId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  type: z.enum(["MANUAL", "SMART"]).optional(),
});

export const bucketGetByIdInput = z.object({
  id: z.string(),
});

export const bucketDeleteInput = z.object({
  id: z.string(),
});

export const bucketReorderInput = z.object({
  campaignId: z.string(),
  bucketIds: z.array(z.string()).min(1),
});

// ── Idea Assignment Schemas ─────────────────────────────────

export const bucketAssignIdeaInput = z.object({
  bucketId: z.string(),
  ideaId: z.string(),
});

export const bucketUnassignIdeaInput = z.object({
  bucketId: z.string(),
  ideaId: z.string(),
});

export const bucketListIdeasInput = z.object({
  bucketId: z.string(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

// ── Sidebar Schema ──────────────────────────────────────────

export const bucketSidebarInput = z.object({
  campaignId: z.string(),
});

// ── Type Exports ────────────────────────────────────────────

export type BucketCreateInput = z.infer<typeof bucketCreateInput>;
export type BucketUpdateInput = z.infer<typeof bucketUpdateInput>;
export type BucketListInput = z.infer<typeof bucketListInput>;
export type BucketReorderInput = z.infer<typeof bucketReorderInput>;
export type BucketAssignIdeaInput = z.infer<typeof bucketAssignIdeaInput>;
export type BucketUnassignIdeaInput = z.infer<typeof bucketUnassignIdeaInput>;
export type BucketListIdeasInput = z.infer<typeof bucketListIdeasInput>;
export type BucketSidebarInput = z.infer<typeof bucketSidebarInput>;

export interface SmartBucketFilterCriteria {
  status?: string;
  minLikes?: number;
  minComments?: number;
  minViews?: number;
  tag?: string;
  category?: string;
  search?: string;
}
