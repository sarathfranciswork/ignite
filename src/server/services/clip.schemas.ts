import { z } from "zod";

export const clipTypeEnum = z.enum(["trend", "insight", "idea"]);

export const clipCreateInput = z.object({
  url: z.string().url("URL must be valid").max(2048, "URL must be 2048 characters or less"),
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  excerpt: z.string().max(10000, "Excerpt must be 10,000 characters or less").optional(),
  imageUrl: z.string().url().max(2048).optional(),
  type: clipTypeEnum,
  tags: z.array(z.string().max(100)).max(20).optional(),
  campaignId: z.string().cuid().optional(),
});

export const clipListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ClipCreateInput = z.infer<typeof clipCreateInput>;
export type ClipListInput = z.input<typeof clipListInput>;
