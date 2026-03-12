import { z } from "zod";

const maturityLevelEnum = z.enum(["EMERGING", "GROWING", "MATURE", "DECLINING"]);
const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

export const technologyListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  maturityLevel: maturityLevelEnum.optional(),
  siaId: z.string().cuid().optional(),
  isArchived: z.boolean().optional(),
  isConfidential: z.boolean().optional(),
  sortBy: sortFieldEnum.default("title"),
  sortDirection: sortDirectionEnum.default("asc"),
});

export const technologyCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(10000, "Description must be 10,000 characters or less").optional(),
  imageUrl: z.string().url().max(2048).optional(),
  sourceUrl: z.string().url().max(2048).optional(),
  maturityLevel: maturityLevelEnum.optional(),
  isConfidential: z.boolean().default(false),
});

export const technologyUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  sourceUrl: z.string().url().max(2048).optional().nullable(),
  maturityLevel: maturityLevelEnum.optional().nullable(),
  isConfidential: z.boolean().optional(),
});

export const technologyGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const technologyDeleteInput = z.object({
  id: z.string().cuid(),
});

export const technologyArchiveInput = z.object({
  id: z.string().cuid(),
});

export const technologyLinkSiaInput = z.object({
  techId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export const technologyUnlinkSiaInput = z.object({
  techId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export type TechnologyListInput = z.input<typeof technologyListInput>;
export type TechnologyCreateInput = z.infer<typeof technologyCreateInput>;
export type TechnologyUpdateInput = z.infer<typeof technologyUpdateInput>;
export type TechnologyLinkSiaInput = z.infer<typeof technologyLinkSiaInput>;
export type TechnologyUnlinkSiaInput = z.infer<typeof technologyUnlinkSiaInput>;
