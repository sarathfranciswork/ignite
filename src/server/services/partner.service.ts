import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import {
  CrunchbaseClient,
  CrunchbaseNotConfiguredError,
} from "../lib/crunchbase-client";
import type {
  ExternalOrg,
  ListOrgsInput,
  CreateOrgInput,
  CrunchbaseOrgDetail,
} from "@/types/partner";

// ============================================================
// Organization CRUD
// ============================================================

export async function listOrganizations(input: ListOrgsInput) {
  const { search, status, industry, page, limit } = input;
  const skip = (page - 1) * limit;

  const where = {
    isArchived: false,
    ...(status && { relationshipStatus: status }),
    ...(industry && {
      industry: { contains: industry, mode: "insensitive" as const },
    }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { websiteUrl: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.organization.count({ where }),
  ]);

  return {
    organizations,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { activities: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  if (!org) {
    throw new Error(`Organization not found: ${id}`);
  }

  return org;
}

export async function createOrganization(input: CreateOrgInput) {
  const org = await prisma.organization.create({
    data: { ...input },
  });

  await prisma.organizationActivity.create({
    data: {
      organizationId: org.id,
      action: "CREATED",
      source: "manual",
    },
  });

  logger.info("Organization created", { id: org.id, name: org.name });
  return org;
}

export async function updateOrganization(
  id: string,
  data: Partial<CreateOrgInput>,
) {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Organization not found: ${id}`);
  }

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, newValue] of Object.entries(data)) {
    const oldValue = existing[key as keyof typeof existing];
    if (oldValue !== newValue) {
      changes[key] = { old: oldValue, new: newValue };
    }
  }

  const org = await prisma.organization.update({
    where: { id },
    data: { ...data },
  });

  if (Object.keys(changes).length > 0) {
    await prisma.organizationActivity.create({
      data: {
        organizationId: id,
        action: "UPDATED",
        changes: changes as Prisma.InputJsonValue,
        source: "manual",
      },
    });
  }

  return org;
}

export async function archiveOrganization(id: string) {
  await prisma.organization.update({
    where: { id },
    data: { isArchived: true, relationshipStatus: "ARCHIVED" },
  });

  await prisma.organizationActivity.create({
    data: {
      organizationId: id,
      action: "ARCHIVED",
      source: "manual",
    },
  });
}

// ============================================================
// Crunchbase Search & Import
// ============================================================

export async function searchExternalOrganizations(
  query: string,
  source: "crunchbase",
): Promise<ExternalOrg[]> {
  if (source !== "crunchbase") {
    throw new Error(`Unsupported external source: ${source}`);
  }

  let client: CrunchbaseClient;
  try {
    client = new CrunchbaseClient();
  } catch {
    throw new CrunchbaseNotConfiguredError();
  }

  const results = await client.searchOrganizations(query);

  const crunchbaseIds = results.map((r) => r.permalink).filter(Boolean);

  const existingOrgs =
    crunchbaseIds.length > 0
      ? await prisma.organization.findMany({
          where: { crunchbaseId: { in: crunchbaseIds } },
          select: { crunchbaseId: true },
        })
      : [];

  const importedIds = new Set(existingOrgs.map((o) => o.crunchbaseId));

  return results.map((result) => ({
    externalId: result.permalink,
    source: "crunchbase" as const,
    name: result.name,
    description: result.shortDescription ?? null,
    logoUrl: result.logoUrl ?? null,
    websiteUrl: result.websiteUrl ?? null,
    industry: result.industry ?? null,
    location: result.location ?? null,
    foundedYear: result.foundedYear ?? null,
    employeeCount: result.employeeCount ?? null,
    fundingStage: result.fundingStage ?? null,
    fundingTotal: result.fundingTotal ?? null,
    alreadyImported: importedIds.has(result.permalink),
  }));
}

export async function importExternalOrganization(
  externalId: string,
  source: "crunchbase",
) {
  if (source !== "crunchbase") {
    throw new Error(`Unsupported external source: ${source}`);
  }

  // Check for duplicate by crunchbaseId
  const existing = await prisma.organization.findUnique({
    where: { crunchbaseId: externalId },
  });

  if (existing) {
    logger.info("Organization already imported", {
      id: existing.id,
      crunchbaseId: externalId,
    });
    return existing;
  }

  let client: CrunchbaseClient;
  try {
    client = new CrunchbaseClient();
  } catch {
    throw new CrunchbaseNotConfiguredError();
  }

  const detail = await client.getOrganization(externalId);

  // Check for duplicate by websiteUrl
  if (detail.websiteUrl) {
    const duplicateByUrl = await prisma.organization.findFirst({
      where: { websiteUrl: detail.websiteUrl },
    });

    if (duplicateByUrl) {
      logger.warn("Duplicate organization found by website URL", {
        existingId: duplicateByUrl.id,
        websiteUrl: detail.websiteUrl,
        crunchbaseId: externalId,
      });
      // Update existing org with Crunchbase data instead of creating new
      return enrichExistingOrganization(duplicateByUrl.id, detail);
    }
  }

  const org = await prisma.organization.create({
    data: {
      name: detail.name,
      description: detail.shortDescription,
      websiteUrl: detail.websiteUrl,
      logoUrl: detail.logoUrl,
      industry: detail.industry,
      location: detail.location,
      foundedYear: detail.foundedYear,
      employeeCount: detail.employeeCount,
      fundingStage: detail.fundingStage,
      fundingTotal: detail.fundingTotal,
      crunchbaseId: externalId,
      managementTeam: detail.managementTeam ?? undefined,
      relationshipStatus: "IDENTIFIED",
    },
  });

  await prisma.organizationActivity.create({
    data: {
      organizationId: org.id,
      action: "IMPORTED",
      source: "crunchbase",
      changes: {
        crunchbaseId: externalId,
        fieldsPopulated: Object.keys(detail).filter(
          (k) => detail[k as keyof typeof detail] != null,
        ),
      },
    },
  });

  logger.info("Organization imported from Crunchbase", {
    id: org.id,
    crunchbaseId: externalId,
  });

  return org;
}

// ============================================================
// Enrichment
// ============================================================

export async function enrichExistingOrganization(
  orgId: string,
  detail: CrunchbaseOrgDetail,
) {
  const existing = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!existing) {
    throw new Error(`Organization not found: ${orgId}`);
  }

  const updates: Record<string, unknown> = {};
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  const fieldsToEnrich = [
    "employeeCount",
    "fundingStage",
    "fundingTotal",
    "industry",
    "location",
    "logoUrl",
    "description",
  ] as const;

  for (const field of fieldsToEnrich) {
    const detailField = field === "description" ? "shortDescription" : field;
    const newValue = detail[detailField as keyof CrunchbaseOrgDetail];
    const oldValue = existing[field as keyof typeof existing];

    if (newValue != null && newValue !== oldValue) {
      updates[field] = newValue;
      changes[field] = { old: oldValue, new: newValue };
    }
  }

  if (detail.managementTeam) {
    updates.managementTeam = detail.managementTeam;
    changes.managementTeam = {
      old: existing.managementTeam,
      new: detail.managementTeam,
    };
  }

  if (!existing.crunchbaseId && detail.permalink) {
    updates.crunchbaseId = detail.permalink;
  }

  if (Object.keys(updates).length === 0) {
    logger.info("No enrichment changes for organization", { orgId });
    return existing;
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: updates,
  });

  await prisma.organizationActivity.create({
    data: {
      organizationId: orgId,
      action: "ENRICHED",
      source: "crunchbase",
      changes: changes as Prisma.InputJsonValue,
    },
  });

  logger.info("Organization enriched from Crunchbase", {
    orgId,
    fieldsUpdated: Object.keys(changes),
  });

  return org;
}

export async function enrichAllCrunchbaseOrganizations(): Promise<{
  total: number;
  enriched: number;
  failed: number;
  skipped: number;
}> {
  const orgs = await prisma.organization.findMany({
    where: {
      crunchbaseId: { not: null },
      isArchived: false,
    },
    select: { id: true, crunchbaseId: true },
  });

  let client: CrunchbaseClient;
  try {
    client = new CrunchbaseClient();
  } catch {
    throw new CrunchbaseNotConfiguredError();
  }

  let enriched = 0;
  let failed = 0;
  let skipped = 0;

  for (const org of orgs) {
    if (!org.crunchbaseId) {
      skipped++;
      continue;
    }

    try {
      const detail = await client.getOrganizationForEnrichment(
        org.crunchbaseId,
      );
      await enrichExistingOrganization(org.id, detail);
      enriched++;
    } catch (error) {
      failed++;
      logger.error("Failed to enrich organization", {
        orgId: org.id,
        crunchbaseId: org.crunchbaseId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Crunchbase enrichment batch complete", {
    total: orgs.length,
    enriched,
    failed,
    skipped,
  });

  return { total: orgs.length, enriched, failed, skipped };
}
