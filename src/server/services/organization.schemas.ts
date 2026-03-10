import { z } from "zod";

export const organizationListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  relationshipStatus: z.enum(["PROSPECT", "ACTIVE", "ON_HOLD", "ENDED"]).optional(),
  industry: z.string().max(100).optional(),
  isConfidential: z.boolean().optional(),
});

export const organizationCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional(),
  website: z.string().url("Must be a valid URL").optional(),
  logoUrl: z.string().url("Must be a valid URL").optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  fundingInfo: z.string().max(500).optional(),
  relationshipStatus: z.enum(["PROSPECT", "ACTIVE", "ON_HOLD", "ENDED"]).default("PROSPECT"),
  ndaStatus: z.enum(["NONE", "PENDING", "SIGNED", "EXPIRED"]).default("NONE"),
  isConfidential: z.boolean().default(false),
  tags: z.array(z.string().max(50)).max(20).default([]),
  notes: z.string().max(5000).optional(),
});

export const organizationUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  fundingInfo: z.string().max(500).optional().nullable(),
  relationshipStatus: z.enum(["PROSPECT", "ACTIVE", "ON_HOLD", "ENDED"]).optional(),
  ndaStatus: z.enum(["NONE", "PENDING", "SIGNED", "EXPIRED"]).optional(),
  isConfidential: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export const organizationGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const organizationDeleteInput = z.object({
  id: z.string().cuid(),
});

export type OrganizationListInput = z.infer<typeof organizationListInput>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateInput>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateInput>;
