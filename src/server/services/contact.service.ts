import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type { ContactListInput, ContactCreateInput, ContactUpdateInput } from "./contact.schemas";

export {
  contactListInput,
  contactCreateInput,
  contactUpdateInput,
  contactDeleteInput,
  contactInviteInput,
} from "./contact.schemas";

export type { ContactListInput, ContactCreateInput, ContactUpdateInput } from "./contact.schemas";

const childLogger = logger.child({ service: "contact" });

export async function listContacts(input: ContactListInput) {
  const where: Prisma.ContactWhereInput = {
    organizationId: input.organizationId,
  };

  if (input.search) {
    where.OR = [
      { firstName: { contains: input.search, mode: "insensitive" } },
      { lastName: { contains: input.search, mode: "insensitive" } },
      { email: { contains: input.search, mode: "insensitive" } },
      { jobTitle: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.contact.findMany({
    where,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
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
    nextCursor,
  };
}

export async function createContact(input: ContactCreateInput, createdById: string) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });

  if (!org) {
    throw new ContactServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  if (input.isPrimary) {
    await prisma.contact.updateMany({
      where: { organizationId: input.organizationId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId: input.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      jobTitle: input.jobTitle,
      linkedinUrl: input.linkedinUrl,
      isPrimary: input.isPrimary,
      notes: input.notes,
      createdById,
    },
  });

  childLogger.info(
    { contactId: contact.id, organizationId: input.organizationId, createdById },
    "Contact created",
  );

  eventBus.emit("organization.contactAdded", {
    entity: "contact",
    entityId: contact.id,
    actor: createdById,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: input.organizationId,
      name: `${input.firstName} ${input.lastName}`,
    },
  });

  return {
    id: contact.id,
    organizationId: contact.organizationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    linkedinUrl: contact.linkedinUrl,
    isPrimary: contact.isPrimary,
    notes: contact.notes,
    inviteStatus: contact.inviteStatus,
    invitedAt: contact.invitedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function updateContact(input: ContactUpdateInput, actorId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id: input.id },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    throw new ContactServiceError("Contact not found", "CONTACT_NOT_FOUND");
  }

  if (input.isPrimary === true) {
    await prisma.contact.updateMany({
      where: {
        organizationId: existing.organizationId,
        isPrimary: true,
        id: { not: input.id },
      },
      data: { isPrimary: false },
    });
  }

  const data: Prisma.ContactUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle;
  if (input.linkedinUrl !== undefined) data.linkedinUrl = input.linkedinUrl;
  if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary;
  if (input.notes !== undefined) data.notes = input.notes;

  const contact = await prisma.contact.update({
    where: { id: input.id },
    data,
  });

  childLogger.info({ contactId: contact.id, actorId }, "Contact updated");

  eventBus.emit("organization.contactUpdated", {
    entity: "contact",
    entityId: contact.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: existing.organizationId,
      updatedFields: Object.keys(data),
    },
  });

  return {
    id: contact.id,
    organizationId: contact.organizationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    linkedinUrl: contact.linkedinUrl,
    isPrimary: contact.isPrimary,
    notes: contact.notes,
    inviteStatus: contact.inviteStatus,
    invitedAt: contact.invitedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export async function deleteContact(id: string, actorId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, organizationId: true, firstName: true, lastName: true },
  });

  if (!existing) {
    throw new ContactServiceError("Contact not found", "CONTACT_NOT_FOUND");
  }

  await prisma.contact.delete({ where: { id } });

  childLogger.info({ contactId: id, actorId }, "Contact deleted");

  eventBus.emit("organization.contactRemoved", {
    entity: "contact",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: existing.organizationId,
      name: `${existing.firstName} ${existing.lastName}`,
    },
  });

  return { id };
}

export async function markContactInvited(id: string, actorId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, email: true, organizationId: true, inviteStatus: true },
  });

  if (!existing) {
    throw new ContactServiceError("Contact not found", "CONTACT_NOT_FOUND");
  }

  if (!existing.email) {
    throw new ContactServiceError("Contact must have an email to be invited", "CONTACT_NO_EMAIL");
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      inviteStatus: "INVITED",
      invitedAt: new Date(),
      invitedBy: actorId,
    },
  });

  childLogger.info({ contactId: id, actorId }, "Contact marked as invited");

  eventBus.emit("organization.contactInvited", {
    entity: "contact",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: existing.organizationId,
      email: existing.email,
    },
  });

  return {
    id: contact.id,
    organizationId: contact.organizationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    linkedinUrl: contact.linkedinUrl,
    isPrimary: contact.isPrimary,
    notes: contact.notes,
    inviteStatus: contact.inviteStatus,
    invitedAt: contact.invitedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export class ContactServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ContactServiceError";
  }
}
