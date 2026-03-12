import { z } from "zod";

const sortFieldEnum = z.enum(["title", "createdAt", "updatedAt"]);
const sortDirectionEnum = z.enum(["asc", "desc"]);

const entityTypeEnum = z.enum(["TREND", "TECHNOLOGY", "IDEA", "SIA"]);

export const portfolioListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  sortBy: sortFieldEnum.default("updatedAt"),
  sortDirection: sortDirectionEnum.default("desc"),
});

export const portfolioCreateInput = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  description: z.string().max(10000, "Description must be 10,000 characters or less").optional(),
});

export const portfolioUpdateInput = z.object({
  id: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
});

export const portfolioGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const portfolioDeleteInput = z.object({
  id: z.string().cuid(),
});

export const portfolioAddItemInput = z.object({
  portfolioId: z.string().cuid(),
  entityType: entityTypeEnum,
  entityId: z.string().cuid(),
  bucketLabel: z.string().max(100).optional(),
});

export const portfolioRemoveItemInput = z.object({
  portfolioId: z.string().cuid(),
  itemId: z.string().cuid(),
});

export const portfolioReorderItemsInput = z.object({
  portfolioId: z.string().cuid(),
  items: z.array(
    z.object({
      id: z.string().cuid(),
      position: z.number().int().min(0),
      bucketLabel: z.string().max(100).optional().nullable(),
    }),
  ),
});

export const portfolioAnalyticsInput = z.object({
  id: z.string().cuid(),
});

export type PortfolioListInput = z.input<typeof portfolioListInput>;
export type PortfolioCreateInput = z.infer<typeof portfolioCreateInput>;
export type PortfolioUpdateInput = z.infer<typeof portfolioUpdateInput>;
export type PortfolioAddItemInput = z.infer<typeof portfolioAddItemInput>;
export type PortfolioRemoveItemInput = z.infer<typeof portfolioRemoveItemInput>;
export type PortfolioReorderItemsInput = z.infer<typeof portfolioReorderItemsInput>;
