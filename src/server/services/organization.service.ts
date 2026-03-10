import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type {
  OrganizationListInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
} from "./organization.schemas";

export {
  organizationListInput,
  organizationCreateInput,
  organizationUpdateInput,
  organizationGetByIdInput,
  organizationDeleteInput,
} from "./organization.schemas";

export type {
  OrganizationListInput,
  OrganizationCreateInput,
  OrganizationUpdateInput,
} from "./organization.schemas";

export {
  contactListInput,
  contactCreateInput,
  contactUpdateInput,
  contactDeleteInput,
  contactInviteInput,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  markContactInvited,
} from "./contact.service";

const childLogger = logger.child({ service: "organization" });

export async function listOrganizations(input: OrganizationListInput) {
  const where: Prisma.OrganizationWhereInput = {};

  if (input.relationshipStatus) {
    where.relationshipStatus = input.relationshipStatus;
  }

  if (input.industry) {
    where.industry = { contains: input.industry, mode: "insensitive" };
  }

  if (input.isConfidential !== undefined) {
    where.isConfidential = input.isConfidential;
  }

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
      { industry: { contains: input.search, mode: "insensitive" } },
      { location: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.organization.findMany({
    where,
    include: {
      _count: { select: { contacts: true } },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: { name: "asc" },
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((org) => ({
      id: org.id,
      name: org.name,
      description: org.description,
      website: org.website,
      logoUrl: org.logoUrl,
      industry: org.industry,
      location: org.location,
      fundingInfo: org.fundingInfo,
      relationshipStatus: org.relationshipStatus,
      ndaStatus: org.ndaStatus,
      isConfidential: org.isConfidential,
      tags: org.tags,
      contactCount: org._count.contacts,
      createdBy: org.createdBy,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function getOrganizationById(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: { select: { contacts: true } },
    },
  });

  if (!org) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    website: org.website,
    logoUrl: org.logoUrl,
    industry: org.industry,
    location: org.location,
    fundingInfo: org.fundingInfo,
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    tags: org.tags,
    notes: org.notes,
    contactCount: org._count.contacts,
    contacts: org.contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      jobTitle: c.jobTitle,
      linkedinUrl: c.linkedinUrl,
      isPrimary: c.isPrimary,
      notes: c.notes,
      inviteStatus: c.inviteStatus,
      invitedAt: c.invitedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    createdBy: org.createdBy,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function createOrganization(input: OrganizationCreateInput, createdById: string) {
  const org = await prisma.organization.create({
    data: {
      name: input.name,
      description: input.description,
      website: input.website,
      logoUrl: input.logoUrl,
      industry: input.industry,
      location: input.location,
      fundingInfo: input.fundingInfo,
      relationshipStatus: input.relationshipStatus,
      ndaStatus: input.ndaStatus,
      isConfidential: input.isConfidential,
      tags: input.tags,
      notes: input.notes,
      createdById,
    },
    include: {
      _count: { select: { contacts: true } },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  childLogger.info({ organizationId: org.id, createdById }, "Organization created");

  eventBus.emit("organization.created", {
    entity: "organization",
    entityId: org.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: { name: org.name, relationshipStatus: org.relationshipStatus },
  });

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    website: org.website,
    logoUrl: org.logoUrl,
    industry: org.industry,
    location: org.location,
    fundingInfo: org.fundingInfo,
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    tags: org.tags,
    notes: org.notes,
    contactCount: org._count.contacts,
    createdBy: org.createdBy,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

export async function updateOrganization(input: OrganizationUpdateInput, actorId: string) {
  const existing = await prisma.organization.findUnique({
    where: { id: input.id },
    select: { id: true },
  });

  if (!existing) {
    throw new OrganizationServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  const data: Prisma.OrganizationUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.website !== undefined) data.website = input.website;
  if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
  if (input.industry !== undefined) data.industry = input.industry;
  if (input.location !== undefined) data.location = input.location;
  if (input.fundingInfo !== undefined) data.fundingInfo = input.fundingInfo;
  if (input.relationshipStatus !== undefined) data.relationshipStatus = input.relationshipStatus;
  if (input.ndaStatus !== undefined) data.ndaStatus = input.ndaStatus;
  if (input.isConfidential !== undefined) data.isConfidential = input.isConfidential;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.notes !== undefined) data.notes = input.notes;

  const org = await prisma.organization.update({
    where: { id: input.id },
    data,
    include: {
      _count: { select: { contacts: true } },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  childLogger.info({ organizationId: org.id, actorId }, "Organization updated");

  eventBus.emit("organization.updated", {
    entity: "organization",
    entityId: org.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: { updatedFields: Object.keys(data) },
  });

  return {
    id: org.id,
    name: org.name,
    description: org.description,
    website: org.website,
    logoUrl: org.logoUrl,
    industry: org.industry,
    location: org.location,
    fundingInfo: org.fundingInfo,
    relationshipStatus: org.relationshipStatus,
    ndaStatus: org.ndaStatus,
    isConfidential: org.isConfidential,
    tags: org.tags,
    notes: org.notes,
    contactCount: org._count.contacts,
    createdBy: org.createdBy,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
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
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const existing = await prisma.organization.findFirst({
    where,
    select: { id: true, name: true },
  });

  return existing
    ? { isDuplicate: true, existingId: existing.id, existingName: existing.name }
    : { isDuplicate: false };
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
