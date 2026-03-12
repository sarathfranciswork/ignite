import { z } from "zod";

const insightTypeEnum = z.enum(["SIGNAL", "OBSERVATION", "OPPORTUNITY", "RISK"]);
const insightScopeEnum = z.enum(["GLOBAL", "CAMPAIGN", "TREND"]);
const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

export const insightListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  type: insightTypeEnum.optional(),
  scope: insightScopeEnum.optional(),
  isArchived: z.boolean().optional(),
  trendId: z.string().cuid().optional(),
  sortBy: sortFieldEnum.default("createdAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const insightCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(10000, "Description must be 10,000 characters or less").optional(),
  type: insightTypeEnum.default("SIGNAL"),
  scope: insightScopeEnum.default("GLOBAL"),
  sourceUrl: z.string().url().max(2048).optional(),
  isEditorial: z.boolean().default(false),
});

export const insightUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  type: insightTypeEnum.optional(),
  scope: insightScopeEnum.optional(),
  sourceUrl: z.string().url().max(2048).optional().nullable(),
});

export const insightGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const insightDeleteInput = z.object({
  id: z.string().cuid(),
});

export const insightArchiveInput = z.object({
  id: z.string().cuid(),
});

export const insightLinkTrendInput = z.object({
  insightId: z.string().cuid(),
  trendId: z.string().cuid(),
});

export const insightUnlinkTrendInput = z.object({
  insightId: z.string().cuid(),
  trendId: z.string().cuid(),
});

export type InsightListInput = z.input<typeof insightListInput>;
export type InsightCreateInput = z.infer<typeof insightCreateInput>;
export type InsightUpdateInput = z.infer<typeof insightUpdateInput>;
export type InsightLinkTrendInput = z.infer<typeof insightLinkTrendInput>;
export type InsightUnlinkTrendInput = z.infer<typeof insightUnlinkTrendInput>;
