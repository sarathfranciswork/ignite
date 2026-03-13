import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { normalizeWebsiteUrl } from "./organization.service";
import type {
  CrunchbaseSearchInput,
  CrunchbaseImportSingleInput,
  CrunchbaseImportBatchInput,
  CrunchbasePreviewInput,
  CrunchbaseOrganization,
  CrunchbaseSearchResult,
  DuplicateCheckResult,
  ImportResult,
  BatchImportResult,
} from "./crunchbase-import.schemas";

const childLogger = logger.child({ service: "crunchbase-import" });

/**
 * Crunchbase API client.
 * Uses the Crunchbase Basic API v4 endpoints.
 * Requires CRUNCHBASE_API_KEY environment variable.
 */
const CRUNCHBASE_API_BASE = "https://api.crunchbase.com/api/v4";

function getCrunchbaseApiKey(): string {
  const apiKey = process.env.CRUNCHBASE_API_KEY;
  if (!apiKey) {
    throw new CrunchbaseImportError(
      "Crunchbase API key is not configured. Set the CRUNCHBASE_API_KEY environment variable.",
      "API_KEY_MISSING",
    );
  }
  return apiKey;
}

function isAvailable(): boolean {
  return Boolean(process.env.CRUNCHBASE_API_KEY);
}

interface CrunchbaseApiOrg {
  uuid?: string;
  identifier?: { permalink?: string; value?: string };
  properties?: {
    name?: string;
    short_description?: string;
    website_url?: string;
    image_url?: string;
    categories?: Array<{ value?: string }>;
    category_groups?: Array<{ value?: string }>;
    location_identifiers?: Array<{ value?: string; location_type?: string }>;
    founded_on?: string;
    num_employees_enum?: string;
    last_funding_type?: string;
    funding_total?: { value?: number; currency?: string };
  };
}

function mapCrunchbaseOrg(raw: CrunchbaseApiOrg): CrunchbaseOrganization {
  const props = raw.properties ?? {};
  const permalink = raw.identifier?.permalink ?? raw.uuid ?? "";

  const categories = props.categories ?? props.category_groups ?? [];
  const industry =
    categories.length > 0
      ? categories
          .map((c) => c.value)
          .filter(Boolean)
          .join(", ")
      : null;

  const locations = props.location_identifiers ?? [];
  const location =
    locations.length > 0
      ? locations
          .map((l) => l.value)
          .filter(Boolean)
          .join(", ")
      : null;

  let foundedYear: number | null = null;
  if (props.founded_on) {
    const year = parseInt(props.founded_on.substring(0, 4), 10);
    if (!isNaN(year) && year >= 1800 && year <= 2100) {
      foundedYear = year;
    }
  }

  let fundingTotal: string | null = null;
  if (props.funding_total?.value !== undefined && props.funding_total.value !== null) {
    const currency = props.funding_total.currency ?? "USD";
    fundingTotal = `${currency} ${props.funding_total.value.toLocaleString("en-US")}`;
  }

  return {
    crunchbaseId: permalink,
    name: props.name ?? permalink,
    description: props.short_description ?? null,
    websiteUrl: props.website_url ?? null,
    logoUrl: props.image_url ?? null,
    industry,
    location,
    foundedYear,
    employeeCount: props.num_employees_enum ?? null,
    fundingStage: props.last_funding_type ?? null,
    fundingTotal,
  };
}

/**
 * Search Crunchbase for organizations matching a query.
 */
export async function searchCrunchbase(
  input: CrunchbaseSearchInput,
): Promise<CrunchbaseSearchResult> {
  const apiKey = getCrunchbaseApiKey();

  const url = new URL(`${CRUNCHBASE_API_BASE}/autocompletes`);
  url.searchParams.set("user_key", apiKey);
  url.searchParams.set("query", input.query);
  url.searchParams.set("collection_ids", "organizations");
  url.searchParams.set("limit", String(input.limit));

  childLogger.info({ query: input.query, limit: input.limit }, "Searching Crunchbase");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const status = response.status;
    childLogger.error({ status, query: input.query }, "Crunchbase search API error");
    throw new CrunchbaseImportError(`Crunchbase API returned status ${status}`, "API_ERROR");
  }

  const data = (await response.json()) as {
    count?: number;
    entities?: Array<{
      identifier?: { permalink?: string; value?: string; uuid?: string };
      short_description?: string;
    }>;
  };

  const entities = data.entities ?? [];

  const organizations: CrunchbaseOrganization[] = entities.map((entity) => ({
    crunchbaseId: entity.identifier?.permalink ?? entity.identifier?.uuid ?? "",
    name: entity.identifier?.value ?? "",
    description: entity.short_description ?? null,
    websiteUrl: null,
    logoUrl: null,
    industry: null,
    location: null,
    foundedYear: null,
    employeeCount: null,
    fundingStage: null,
    fundingTotal: null,
  }));

  return {
    organizations,
    totalCount: data.count ?? organizations.length,
  };
}

/**
 * Fetch detailed organization data from Crunchbase by permalink/ID.
 */
export async function fetchCrunchbaseOrganization(
  crunchbaseId: string,
): Promise<CrunchbaseOrganization> {
  const apiKey = getCrunchbaseApiKey();

  const url = new URL(
    `${CRUNCHBASE_API_BASE}/entities/organizations/${encodeURIComponent(crunchbaseId)}`,
  );
  url.searchParams.set("user_key", apiKey);
  url.searchParams.set(
    "field_ids",
    [
      "name",
      "short_description",
      "website_url",
      "image_url",
      "categories",
      "category_groups",
      "location_identifiers",
      "founded_on",
      "num_employees_enum",
      "last_funding_type",
      "funding_total",
    ].join(","),
  );

  childLogger.info({ crunchbaseId }, "Fetching Crunchbase organization");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 404) {
    throw new CrunchbaseImportError(
      `Organization '${crunchbaseId}' not found on Crunchbase`,
      "ORG_NOT_FOUND",
    );
  }

  if (!response.ok) {
    const status = response.status;
    childLogger.error({ status, crunchbaseId }, "Crunchbase fetch API error");
    throw new CrunchbaseImportError(`Crunchbase API returned status ${status}`, "API_ERROR");
  }

  const data = (await response.json()) as CrunchbaseApiOrg;
  return mapCrunchbaseOrg({
    ...data,
    identifier: { permalink: crunchbaseId, ...(data.identifier ?? {}) },
  });
}

/**
 * Check for duplicates by crunchbase ID, website URL, and name.
 */
export async function checkDuplicates(org: CrunchbaseOrganization): Promise<DuplicateCheckResult> {
  // Check by Crunchbase ID first (exact match)
  if (org.crunchbaseId) {
    const byId = await prisma.organization.findUnique({
      where: { crunchbaseId: org.crunchbaseId },
      select: { id: true, name: true },
    });

    if (byId) {
      return {
        crunchbaseId: org.crunchbaseId,
        isDuplicate: true,
        matchType: "crunchbase_id",
        existingId: byId.id,
        existingName: byId.name,
      };
    }
  }

  // Check by website URL (normalized domain comparison)
  if (org.websiteUrl) {
    const normalizedDomain = normalizeWebsiteUrl(org.websiteUrl);
    const orgsWithUrl = await prisma.organization.findMany({
      where: { websiteUrl: { not: null } },
      select: { id: true, name: true, websiteUrl: true },
    });

    const match = orgsWithUrl.find(
      (existing) =>
        existing.websiteUrl && normalizeWebsiteUrl(existing.websiteUrl) === normalizedDomain,
    );

    if (match) {
      return {
        crunchbaseId: org.crunchbaseId,
        isDuplicate: true,
        matchType: "website_url",
        existingId: match.id,
        existingName: match.name,
      };
    }
  }

  // Check by name (case-insensitive)
  const byName = await prisma.organization.findFirst({
    where: { name: { equals: org.name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  if (byName) {
    return {
      crunchbaseId: org.crunchbaseId,
      isDuplicate: true,
      matchType: "name",
      existingId: byName.id,
      existingName: byName.name,
    };
  }

  return {
    crunchbaseId: org.crunchbaseId,
    isDuplicate: false,
    matchType: null,
    existingId: null,
    existingName: null,
  };
}

/**
 * Preview a Crunchbase organization before importing.
 * Fetches data from Crunchbase and checks for duplicates.
 */
export async function previewImport(input: CrunchbasePreviewInput) {
  const org = await fetchCrunchbaseOrganization(input.crunchbaseId);
  const duplicateCheck = await checkDuplicates(org);

  return {
    organization: org,
    duplicateCheck,
  };
}

/**
 * Import a single organization from Crunchbase.
 */
export async function importSingle(
  input: CrunchbaseImportSingleInput,
  actorId: string,
): Promise<ImportResult> {
  const org = await fetchCrunchbaseOrganization(input.crunchbaseId);

  if (!input.skipDuplicateCheck) {
    const duplicateCheck = await checkDuplicates(org);
    if (duplicateCheck.isDuplicate) {
      childLogger.info(
        { crunchbaseId: input.crunchbaseId, matchType: duplicateCheck.matchType },
        "Import skipped: duplicate organization detected",
      );
      return {
        crunchbaseId: input.crunchbaseId,
        status: "skipped_duplicate",
        organizationId: duplicateCheck.existingId,
        organizationName: duplicateCheck.existingName,
        error: null,
        duplicateInfo: duplicateCheck,
      };
    }
  }

  const created = await prisma.organization.create({
    data: {
      name: org.name,
      description: org.description,
      websiteUrl: org.websiteUrl,
      logoUrl: org.logoUrl,
      industry: org.industry,
      location: org.location,
      foundedYear: org.foundedYear,
      employeeCount: org.employeeCount,
      fundingStage: org.fundingStage,
      fundingTotal: org.fundingTotal,
      crunchbaseId: org.crunchbaseId,
      relationshipStatus: "IDENTIFIED",
      managers: {
        create: {
          userId: actorId,
          role: "INTERNAL_MANAGER",
        },
      },
    },
    select: { id: true, name: true },
  });

  childLogger.info(
    { organizationId: created.id, crunchbaseId: input.crunchbaseId },
    "Organization imported from Crunchbase",
  );

  eventBus.emit("organization.created", {
    entity: "organization",
    entityId: created.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      name: created.name,
      source: "crunchbase",
      crunchbaseId: input.crunchbaseId,
    },
  });

  return {
    crunchbaseId: input.crunchbaseId,
    status: "created",
    organizationId: created.id,
    organizationName: created.name,
    error: null,
    duplicateInfo: null,
  };
}

/**
 * Batch import multiple organizations from Crunchbase.
 */
export async function importBatch(
  input: CrunchbaseImportBatchInput,
  actorId: string,
): Promise<BatchImportResult> {
  const results: ImportResult[] = [];

  for (const crunchbaseId of input.crunchbaseIds) {
    try {
      const result = await importSingle(
        { crunchbaseId, skipDuplicateCheck: input.skipDuplicateCheck },
        actorId,
      );
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      childLogger.error(
        { crunchbaseId, error: errorMessage },
        "Failed to import organization from Crunchbase",
      );
      results.push({
        crunchbaseId,
        status: "failed",
        organizationId: null,
        organizationName: null,
        error: errorMessage,
        duplicateInfo: null,
      });
    }
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.status === "created").length,
    skippedDuplicate: results.filter((r) => r.status === "skipped_duplicate").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  childLogger.info(summary, "Batch Crunchbase import completed");

  return { results, summary };
}

/**
 * Check whether Crunchbase integration is available.
 */
export function getCrunchbaseStatus(): {
  available: boolean;
  configured: boolean;
} {
  return {
    available: isAvailable(),
    configured: isAvailable(),
  };
}

export class CrunchbaseImportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CrunchbaseImportError";
  }
}
