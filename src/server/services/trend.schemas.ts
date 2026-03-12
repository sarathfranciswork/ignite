import { z } from "zod";

const trendTypeEnum = z.enum(["MEGA", "MACRO", "MICRO"]);
const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt", "businessRelevance"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

export const trendListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  type: trendTypeEnum.optional(),
  siaId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional().nullable(),
  isArchived: z.boolean().optional(),
  isConfidential: z.boolean().optional(),
  sortBy: sortFieldEnum.default("title"),
  sortDirection: sortDirectionEnum.default("asc"),
});

export const trendCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(10000, "Description must be 10,000 characters or less").optional(),
  imageUrl: z.string().url().max(2048).optional(),
  sourceUrl: z.string().url().max(2048).optional(),
  type: trendTypeEnum.default("MICRO"),
  isConfidential: z.boolean().default(false),
  isCommunitySubmitted: z.boolean().default(false),
  trendOneId: z.string().max(200).optional(),
  businessRelevance: z.number().min(0).max(10).optional(),
  parentId: z.string().cuid().optional().nullable(),
});

export const trendUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  sourceUrl: z.string().url().max(2048).optional().nullable(),
  type: trendTypeEnum.optional(),
  isConfidential: z.boolean().optional(),
  isCommunitySubmitted: z.boolean().optional(),
  trendOneId: z.string().max(200).optional().nullable(),
  businessRelevance: z.number().min(0).max(10).optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

export const trendGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const trendDeleteInput = z.object({
  id: z.string().cuid(),
});

export const trendArchiveInput = z.object({
  id: z.string().cuid(),
});

export const trendLinkSiaInput = z.object({
  trendId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export const trendUnlinkSiaInput = z.object({
  trendId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export type TrendListInput = z.input<typeof trendListInput>;
export type TrendCreateInput = z.infer<typeof trendCreateInput>;
export type TrendUpdateInput = z.infer<typeof trendUpdateInput>;
export type TrendLinkSiaInput = z.infer<typeof trendLinkSiaInput>;
export type TrendUnlinkSiaInput = z.infer<typeof trendUnlinkSiaInput>;
