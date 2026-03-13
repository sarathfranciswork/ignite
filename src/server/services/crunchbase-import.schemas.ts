import { z } from "zod";

export const crunchbaseSearchInput = z.object({
  query: z.string().min(1, "Search query is required").max(200),
  limit: z.number().int().min(1).max(25).default(10),
});

export const crunchbaseImportSingleInput = z.object({
  crunchbaseId: z.string().min(1, "Crunchbase ID is required").max(200),
  skipDuplicateCheck: z.boolean().default(false),
});

export const crunchbaseImportBatchInput = z.object({
  crunchbaseIds: z
    .array(z.string().min(1).max(200))
    .min(1, "At least one Crunchbase ID is required")
    .max(50, "Maximum 50 organizations per batch"),
  skipDuplicateCheck: z.boolean().default(false),
});

export const crunchbasePreviewInput = z.object({
  crunchbaseId: z.string().min(1, "Crunchbase ID is required").max(200),
});

export type CrunchbaseSearchInput = z.infer<typeof crunchbaseSearchInput>;
export type CrunchbaseImportSingleInput = z.infer<typeof crunchbaseImportSingleInput>;
export type CrunchbaseImportBatchInput = z.infer<typeof crunchbaseImportBatchInput>;
export type CrunchbasePreviewInput = z.infer<typeof crunchbasePreviewInput>;

export interface CrunchbaseOrganization {
  crunchbaseId: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  industry: string | null;
  location: string | null;
  foundedYear: number | null;
  employeeCount: string | null;
  fundingStage: string | null;
  fundingTotal: string | null;
}

export interface CrunchbaseSearchResult {
  organizations: CrunchbaseOrganization[];
  totalCount: number;
}

export interface DuplicateCheckResult {
  crunchbaseId: string;
  isDuplicate: boolean;
  matchType: "crunchbase_id" | "website_url" | "name" | null;
  existingId: string | null;
  existingName: string | null;
}

export interface ImportResult {
  crunchbaseId: string;
  status: "created" | "skipped_duplicate" | "failed";
  organizationId: string | null;
  organizationName: string | null;
  error: string | null;
  duplicateInfo: DuplicateCheckResult | null;
}

export interface BatchImportResult {
  results: ImportResult[];
  summary: {
    total: number;
    created: number;
    skippedDuplicate: number;
    failed: number;
  };
}
