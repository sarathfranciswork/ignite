import { z } from "zod";

// ============================================================
// Crunchbase External API Response Types
// ============================================================

export const CrunchbaseSearchResultSchema = z.object({
  uuid: z.string(),
  permalink: z.string(),
  name: z.string(),
  shortDescription: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  foundedYear: z.number().nullable().optional(),
  employeeCount: z.string().nullable().optional(),
  fundingStage: z.string().nullable().optional(),
  fundingTotal: z.string().nullable().optional(),
});

export type CrunchbaseSearchResult = z.infer<
  typeof CrunchbaseSearchResultSchema
>;

export const CrunchbaseOrgDetailSchema = CrunchbaseSearchResultSchema.extend({
  managementTeam: z
    .array(
      z.object({
        name: z.string(),
        title: z.string().nullable().optional(),
        linkedinUrl: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  categories: z.array(z.string()).nullable().optional(),
  fundingRounds: z
    .array(
      z.object({
        roundType: z.string(),
        amount: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        investors: z.array(z.string()).nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  newsItems: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

export type CrunchbaseOrgDetail = z.infer<typeof CrunchbaseOrgDetailSchema>;

// ============================================================
// Input Schemas (for tRPC router validation)
// ============================================================

export const SearchExternalInputSchema = z.object({
  query: z.string().min(1).max(200),
  source: z.enum(["crunchbase"]),
});

export type SearchExternalInput = z.infer<typeof SearchExternalInputSchema>;

export const ImportExternalInputSchema = z.object({
  externalId: z.string().min(1),
  source: z.enum(["crunchbase"]),
});

export type ImportExternalInput = z.infer<typeof ImportExternalInputSchema>;

// ============================================================
// Output Schemas
// ============================================================

export const ExternalOrgSchema = z.object({
  externalId: z.string(),
  source: z.enum(["crunchbase"]),
  name: z.string(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  foundedYear: z.number().nullable().optional(),
  employeeCount: z.string().nullable().optional(),
  fundingStage: z.string().nullable().optional(),
  fundingTotal: z.string().nullable().optional(),
  alreadyImported: z.boolean(),
});

export type ExternalOrg = z.infer<typeof ExternalOrgSchema>;

export const OrgRelationshipStatusEnum = z.enum([
  "IDENTIFIED",
  "VERIFIED",
  "QUALIFIED",
  "EVALUATION",
  "PILOT",
  "PARTNERSHIP",
  "ARCHIVED",
]);

export const ListOrgsInputSchema = z.object({
  search: z.string().optional(),
  status: OrgRelationshipStatusEnum.optional(),
  industry: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ListOrgsInput = z.infer<typeof ListOrgsInputSchema>;

export const GetOrgByIdInputSchema = z.object({
  id: z.string().min(1),
});

export const CreateOrgInputSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  websiteUrl: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
  industry: z.string().max(200).optional(),
  location: z.string().max(300).optional(),
  foundedYear: z.number().int().min(1800).max(2100).optional(),
  employeeCount: z.string().max(50).optional(),
  fundingStage: z.string().max(100).optional(),
  fundingTotal: z.string().max(100).optional(),
});

export type CreateOrgInput = z.infer<typeof CreateOrgInputSchema>;

export const UpdateOrgInputSchema = z.object({
  id: z.string().min(1),
  data: CreateOrgInputSchema.partial(),
});

export type UpdateOrgInput = z.infer<typeof UpdateOrgInputSchema>;

export const ArchiveOrgInputSchema = z.object({
  id: z.string().min(1),
});
