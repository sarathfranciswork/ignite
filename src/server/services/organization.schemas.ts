import { z } from "zod";

const httpsUrl = z
  .string()
  .url("Must be a valid URL")
  .max(2048)
  .refine((url: string) => /^https?:\/\//i.test(url), "URL must use http or https protocol");

const relationshipStatusEnum = z.enum([
  "IDENTIFIED",
  "VERIFIED",
  "QUALIFIED",
  "EVALUATION",
  "PILOT",
  "PARTNERSHIP",
  "ARCHIVED",
]);

const ndaStatusEnum = z.enum(["NONE", "REQUESTED", "SIGNED", "EXPIRED"]);

const sortFieldEnum = z.enum(["name", "relationshipStatus", "createdAt", "updatedAt"]);

const sortDirectionEnum = z.enum(["asc", "desc"]);

export const organizationListInput = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  relationshipStatus: relationshipStatusEnum.optional(),
  industries: z.array(z.string().max(100)).max(20).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  ndaStatus: ndaStatusEnum.optional(),
  isConfidential: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  sortBy: sortFieldEnum.default("name"),
  sortDirection: sortDirectionEnum.default("asc"),
});

export const organizationCreateInput = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().max(5000, "Description must be 5000 characters or less").optional(),
  websiteUrl: httpsUrl.optional(),
  logoUrl: httpsUrl.optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  employeeCount: z.string().max(50).optional(),
  fundingStage: z.string().max(100).optional(),
  fundingTotal: z.string().max(100).optional(),
  relationshipStatus: relationshipStatusEnum.default("IDENTIFIED"),
  ndaStatus: ndaStatusEnum.default("NONE"),
  isConfidential: z.boolean().default(false),
  crunchbaseId: z.string().max(200).optional(),
  innospotId: z.string().max(200).optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  managementTeam: z.record(z.string(), z.string()).optional(),
});

export const organizationUpdateInput = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  websiteUrl: httpsUrl.optional().nullable(),
  logoUrl: httpsUrl.optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  foundedYear: z.number().int().min(1800).max(2100).optional().nullable(),
  employeeCount: z.string().max(50).optional().nullable(),
  fundingStage: z.string().max(100).optional().nullable(),
  fundingTotal: z.string().max(100).optional().nullable(),
  relationshipStatus: relationshipStatusEnum.optional(),
  ndaStatus: ndaStatusEnum.optional(),
  isConfidential: z.boolean().optional(),
  crunchbaseId: z.string().max(200).optional().nullable(),
  innospotId: z.string().max(200).optional().nullable(),
  customFields: z.record(z.string(), z.string()).optional().nullable(),
  managementTeam: z.record(z.string(), z.string()).optional().nullable(),
});

export const organizationSetConfidentialInput = z.object({
  id: z.string().cuid(),
  isConfidential: z.boolean(),
});

export const organizationGetByIdInput = z.object({
  id: z.string().cuid(),
});

export const organizationDeleteInput = z.object({
  id: z.string().cuid(),
});

export const checkDuplicateByUrlInput = z.object({
  websiteUrl: z.string().url().max(2048),
  excludeId: z.string().cuid().optional(),
});

export const checkDuplicateByCrunchbaseIdInput = z.object({
  crunchbaseId: z.string().min(1).max(200),
  excludeId: z.string().cuid().optional(),
});

export type OrganizationListInput = z.input<typeof organizationListInput>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateInput>;
export type OrganizationUpdateInput = z.infer<typeof organizationUpdateInput>;
export type CheckDuplicateByUrlInput = z.infer<typeof checkDuplicateByUrlInput>;
export type OrganizationSetConfidentialInput = z.infer<typeof organizationSetConfidentialInput>;
export type CheckDuplicateByCrunchbaseIdInput = z.infer<typeof checkDuplicateByCrunchbaseIdInput>;
