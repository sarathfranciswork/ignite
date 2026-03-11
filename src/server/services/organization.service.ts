import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { Prisma } from "@prisma/client";
import type {
  OrganizationListInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
  CheckDuplicateByUrlInput,
  CheckDuplicateByCrunchbaseIdInput,
} from "./organization.schemas";

type JsonSafe = Record<string, string> | null;

const managerInclude = {
  include: { user: { select: { id: true, name: true, email: true } } },
} as const;

const orgWithManagersInclude = {
  _count: { select: { contacts: true } },
  managers: managerInclude,
} as const;

type OrgWithManagers = Prisma.OrganizationGetPayload<{
  include: typeof orgWithManagersInclude;
}>;

function mapOrganizationToResponse(org: OrgWithManagers) {
  return {
    id: org.id,
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
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    isArchived: org.isArchived,
    crunchbaseId: org.crunchbaseId,
    innospotId: org.innospotId,
    customFields: org.customFields as JsonSafe,
    managementTeam: org.managementTeam as JsonSafe,
    contactCount: org._count.contacts,
    managers: org.managers.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
      assignedAt: m.assignedAt.toISOString(),
    })),
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

/**
 * Normalize a website URL to a comparable domain string.
 * Strips protocol, www prefix, trailing slashes, and lowercases.
 * e.g. "https://www.Acme.com/about/" -> "acme.com"
 */
export function normalizeWebsiteUrl(url: string): string {
  let domain = url.toLowerCase().trim();
  domain = domain.replace(/^https?:\/\//, "");
  domain = domain.replace(/^www\./, "");
  domain = domain.replace(/\/+$/, "");
  // Remove path, query, and hash - keep only domain
  const slashIndex = domain.indexOf("/");
  if (slashIndex !== -1) {
    domain = domain.substring(0, slashIndex);
  }
  return domain;
}

const childLogger = logger.child({ service: "organization" });

export async function listOrganizations(input: OrganizationListInput) {
  const where: Prisma.OrganizationWhereInput = {};

  if (input.relationshipStatus) {
    where.relationshipStatus = input.relationshipStatus;
  }

  if (input.industries && input.industries.length > 0) {
    where.OR = input.industries.map((ind) => ({
      industry: { contains: ind, mode: "insensitive" as const },
    }));
  } else if (input.industry) {
    where.industry = { contains: input.industry, mode: "insensitive" };
  }

  if (input.location) {
    where.location = { contains: input.location, mode: "insensitive" };
  }

  if (input.ndaStatus) {
    where.ndaStatus = input.ndaStatus;
  }

  if (input.isConfidential !== undefined) {
    where.isConfidential = input.isConfidential;
  }

  if (input.isArchived !== undefined) {
    where.isArchived = input.isArchived;
  }

  if (input.search) {
    const searchConditions: Prisma.OrganizationWhereInput[] = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
      { industry: { contains: input.search, mode: "insensitive" } },
      { location: { contains: input.search, mode: "insensitive" } },
      { websiteUrl: { contains: input.search, mode: "insensitive" } },
    ];

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchConditions }];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  const sortBy = input.sortBy ?? "name";
  const sortDirection = input.sortDirection ?? "asc";
  const orderBy: Prisma.OrganizationOrderByWithRelationInput = { [sortBy]: sortDirection };
  const limit = input.limit ?? 20;

  const items = await prisma.organization.findMany({
    where,
    include: {
      ...orgWithManagersInclude,
      managers: { ...managerInclude, take: 3 },
    },
    take: limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy,
  });

  let nextCursor: string | undefined;
  if (items.length > limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map(mapOrganizationToResponse),
    nextCursor,
  };
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      ...orgWithManagersInclude,
      contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] },
    },
  });

  if (!org) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  return {
    ...mapOrganizationToResponse(org),
    contacts: org.contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      title: c.title,
      isPrimary: c.isPrimary,
      invitationStatus: c.invitationStatus,
      linkedUserId: c.linkedUserId,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

export async function createOrganization(input: OrganizationCreateInput, actorId: string) {
  if (input.crunchbaseId) {
    const existing = await prisma.organization.findUnique({
      where: { crunchbaseId: input.crunchbaseId },
      select: { id: true },
    });
    if (existing) {
      throw new OrganizationServiceError(
        "An organization with this Crunchbase ID already exists",
        "DUPLICATE_CRUNCHBASE_ID",
      );
    }
  }

  const org = await prisma.organization.create({
    data: {
      name: input.name,
      description: input.description,
      websiteUrl: input.websiteUrl,
      logoUrl: input.logoUrl,
      industry: input.industry,
      location: input.location,
      foundedYear: input.foundedYear,
      employeeCount: input.employeeCount,
      fundingStage: input.fundingStage,
      fundingTotal: input.fundingTotal,
      relationshipStatus: input.relationshipStatus,
      ndaStatus: input.ndaStatus,
      isConfidential: input.isConfidential,
      crunchbaseId: input.crunchbaseId,
      innospotId: input.innospotId,
      customFields: input.customFields,
      managementTeam: input.managementTeam,
      managers: {
        create: {
          userId: actorId,
          role: "INTERNAL_MANAGER",
        },
      },
    },
    include: orgWithManagersInclude,
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization created");

  eventBus.emit("organization.created", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: org.name, relationshipStatus: org.relationshipStatus },
  });

  return mapOrganizationToResponse(org);
}

export async function updateOrganization(input: OrganizationUpdateInput, actorId: string) {
  const existing = await prisma.organization.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  if (input.crunchbaseId !== undefined && input.crunchbaseId !== null) {
    const dup = await prisma.organization.findFirst({
      where: { crunchbaseId: input.crunchbaseId, id: { not: input.id } },
      select: { id: true },
    });
    if (dup) {
      throw new OrganizationServiceError(
        "An organization with this Crunchbase ID already exists",
        "DUPLICATE_CRUNCHBASE_ID",
      );
    }
  }

  const scalarFields = [
    "name",
    "description",
    "websiteUrl",
    "logoUrl",
    "industry",
    "location",
    "foundedYear",
    "employeeCount",
    "fundingStage",
    "fundingTotal",
    "relationshipStatus",
    "ndaStatus",
    "isConfidential",
    "crunchbaseId",
    "innospotId",
  ] as const;
  const data: Prisma.OrganizationUpdateInput = {};
  for (const key of scalarFields) {
    if (input[key] !== undefined) {
      (data as Record<string, unknown>)[key] = input[key];
    }
  }
  if (input.customFields !== undefined)
    data.customFields = input.customFields === null ? Prisma.DbNull : input.customFields;
  if (input.managementTeam !== undefined)
    data.managementTeam = input.managementTeam === null ? Prisma.DbNull : input.managementTeam;

  const org = await prisma.organization.update({
    where: { id: input.id },
    data,
    include: orgWithManagersInclude,
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization updated");

  eventBus.emit("organization.updated", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return mapOrganizationToResponse(org);
}

export async function deleteOrganization(id: string, actorId: string) {
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }
  await prisma.organization.delete({ where: { id } });
  childLogger.info({ organizationId: id, actorId }, "Organization deleted");

  eventBus.emit("organization.deleted", {
    entity: "organization",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { name: existing.name },
  });

  return { id };
}

export async function checkDuplicateOrganization(name: string, excludeId?: string) {
  const where: Prisma.OrganizationWhereInput = {
    name: { equals: name, mode: "insensitive" },
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };
  const existing = await prisma.organization.findFirst({
    where,
    select: { id: true, name: true },
  });
  return existing
    ? { isDuplicate: true, existingId: existing.id, existingName: existing.name }
    : { isDuplicate: false };
}

export async function checkDuplicateByUrl(input: CheckDuplicateByUrlInput) {
  const normalizedDomain = normalizeWebsiteUrl(input.websiteUrl);

  // Find all orgs with a website URL, then compare normalized domains
  const orgsWithUrl = await prisma.organization.findMany({
    where: {
      websiteUrl: { not: null },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true, name: true, websiteUrl: true },
  });

  const match = orgsWithUrl.find(
    (org) => org.websiteUrl && normalizeWebsiteUrl(org.websiteUrl) === normalizedDomain,
  );

  if (match) {
    return { isDuplicate: true as const, existingId: match.id, existingName: match.name };
  }
  return { isDuplicate: false as const, existingId: undefined, existingName: undefined };
}

export async function checkDuplicateByCrunchbaseId(input: CheckDuplicateByCrunchbaseIdInput) {
  const existing = await prisma.organization.findFirst({
    where: {
      crunchbaseId: input.crunchbaseId,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
    select: { id: true, name: true },
  });

  if (existing) {
    return { isDuplicate: true as const, existingId: existing.id, existingName: existing.name };
  }
  return { isDuplicate: false as const, existingId: undefined, existingName: undefined };
}

export async function getDistinctIndustries(): Promise<string[]> {
  const result = await prisma.organization.findMany({
    where: { industry: { not: null } },
    select: { industry: true },
    distinct: ["industry"],
    orderBy: { industry: "asc" },
  });
  return result.map((r) => r.industry).filter((i): i is string => i !== null);
}

export async function getDistinctLocations(): Promise<string[]> {
  const result = await prisma.organization.findMany({
    where: { location: { not: null } },
    select: { location: true },
    distinct: ["location"],
    orderBy: { location: "asc" },
  });
  return result.map((r) => r.location).filter((l): l is string => l !== null);
}

export class OrganizationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "OrganizationServiceError";
  }
}
