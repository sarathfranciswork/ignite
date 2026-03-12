import { z } from "zod";

const technologyCategoryEnum = z.enum([
  "AI_ML",
  "BLOCKCHAIN",
  "CLOUD",
  "CYBERSECURITY",
  "DATA_ANALYTICS",
  "HARDWARE",
  "IOT",
  "MOBILE",
  "NETWORKING",
  "ROBOTICS",
  "SOFTWARE",
  "OTHER",
]);

const technologyMaturityEnum = z.enum(["EMERGING", "GROWING", "MATURE", "DECLINING"]);

const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt", "businessRelevance"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

export const technologyListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  category: technologyCategoryEnum.optional(),
  maturity: technologyMaturityEnum.optional(),
  siaId: z.string().cuid().optional(),
  campaignId: z.string().cuid().optional(),
  ideaId: z.string().cuid().optional(),
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
  category: technologyCategoryEnum.default("OTHER"),
  maturity: technologyMaturityEnum.default("EMERGING"),
  isConfidential: z.boolean().default(false),
  isCommunitySubmitted: z.boolean().default(false),
  businessRelevance: z.number().min(0).max(10).optional(),
});

export const technologyUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  imageUrl: z.string().url().max(2048).optional().nullable(),
  sourceUrl: z.string().url().max(2048).optional().nullable(),
  category: technologyCategoryEnum.optional(),
  maturity: technologyMaturityEnum.optional(),
  isConfidential: z.boolean().optional(),
  isCommunitySubmitted: z.boolean().optional(),
  businessRelevance: z.number().min(0).max(10).optional().nullable(),
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
  technologyId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export const technologyUnlinkSiaInput = z.object({
  technologyId: z.string().cuid(),
  siaId: z.string().cuid(),
});

export const technologyLinkCampaignInput = z.object({
  technologyId: z.string().cuid(),
  campaignId: z.string().cuid(),
});

export const technologyUnlinkCampaignInput = z.object({
  technologyId: z.string().cuid(),
  campaignId: z.string().cuid(),
});

export const technologyLinkIdeaInput = z.object({
  technologyId: z.string().cuid(),
  ideaId: z.string().cuid(),
});

export const technologyUnlinkIdeaInput = z.object({
  technologyId: z.string().cuid(),
  ideaId: z.string().cuid(),
});

export type TechnologyListInput = z.input<typeof technologyListInput>;
export type TechnologyCreateInput = z.infer<typeof technologyCreateInput>;
export type TechnologyUpdateInput = z.infer<typeof technologyUpdateInput>;
export type TechnologyLinkSiaInput = z.infer<typeof technologyLinkSiaInput>;
export type TechnologyUnlinkSiaInput = z.infer<typeof technologyUnlinkSiaInput>;
export type TechnologyLinkCampaignInput = z.infer<typeof technologyLinkCampaignInput>;
export type TechnologyUnlinkCampaignInput = z.infer<typeof technologyUnlinkCampaignInput>;
export type TechnologyLinkIdeaInput = z.infer<typeof technologyLinkIdeaInput>;
export type TechnologyUnlinkIdeaInput = z.infer<typeof technologyUnlinkIdeaInput>;
