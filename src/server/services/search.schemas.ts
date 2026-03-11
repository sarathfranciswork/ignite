import { z } from "zod";

export const searchEntityType = z.enum(["idea", "campaign", "channel", "user"]);
export type SearchEntityType = z.infer<typeof searchEntityType>;

export const globalSearchInput = z.object({
  query: z.string().min(1, "Search query is required").max(500),
  entityTypes: z.array(searchEntityType).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type GlobalSearchInput = z.infer<typeof globalSearchInput>;

export const exploreListInput = z.object({
  entityType: searchEntityType,
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(500).optional(),
  sortBy: z.enum(["date", "name", "comments", "votes", "status"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().max(50).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export type ExploreListInput = z.infer<typeof exploreListInput>;

export const savedSearchCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(100),
  query: z.string().min(1).max(500),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export type SavedSearchCreateInput = z.infer<typeof savedSearchCreateInput>;

export const savedSearchDeleteInput = z.object({
  id: z.string().cuid(),
});

export type SavedSearchDeleteInput = z.infer<typeof savedSearchDeleteInput>;
