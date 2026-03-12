import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { GlobalRole } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";
import type {
  ScimUserPayload,
  ScimPatchRequest,
  ScimGroupPayload,
  ScimListQuery,
  ScimTokenCreateInput,
  ScimTokenListInput,
} from "./scim.schemas";

// ── Error Handling ──────────────────────────────────────────────

type ScimErrorCode =
  | "TOKEN_NOT_FOUND"
  | "TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "USER_NOT_FOUND"
  | "USER_ALREADY_EXISTS"
  | "GROUP_NOT_FOUND"
  | "GROUP_ALREADY_EXISTS"
  | "INVALID_FILTER"
  | "INVALID_PATCH";

export class ScimServiceError extends Error {
  constructor(
    public code: ScimErrorCode,
    message: string,
    public httpStatus: number = 400,
  ) {
    super(message);
    this.name = "ScimServiceError";
  }
}

// ── SCIM Response Helpers ───────────────────────────────────────

const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
const SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";

interface ScimMeta {
  resourceType: string;
  created: string;
  lastModified: string;
  location?: string;
}

function buildUserMeta(user: { createdAt: Date; updatedAt: Date; id: string }): ScimMeta {
  return {
    resourceType: "User",
    created: user.createdAt.toISOString(),
    lastModified: user.updatedAt.toISOString(),
    location: `/api/scim/v2/Users/${user.id}`,
  };
}

function buildGroupMeta(group: { createdAt: Date; updatedAt: Date; id: string }): ScimMeta {
  return {
    resourceType: "Group",
    created: group.createdAt.toISOString(),
    lastModified: group.updatedAt.toISOString(),
    location: `/api/scim/v2/Groups/${group.id}`,
  };
}

function toScimUser(user: {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  scimExternalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: user.scimExternalId ?? undefined,
    userName: user.email,
    name: user.name ? { formatted: user.name } : undefined,
    displayName: user.name ?? undefined,
    emails: [{ value: user.email, type: "work", primary: true }],
    active: user.isActive,
    meta: buildUserMeta(user),
  };
}

function toScimGroup(group: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members?: Array<{ user: { id: string; email: string; name: string | null } }>;
}) {
  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: group.id,
    displayName: group.name,
    members: group.members?.map((m) => ({
      value: m.user.id,
      display: m.user.name ?? m.user.email,
    })),
    meta: buildGroupMeta(group),
  };
}

// ── SCIM Filtering ──────────────────────────────────────────────

function parseScimFilter(filter: string): { field: string; op: string; value: string } | null {
  const match = filter.match(/^(\w+)\s+(eq|co|sw)\s+"([^"]*)"$/);
  if (!match) return null;
  return { field: match[1], op: match[2], value: match[3] };
}

function buildUserWhere(filter?: string) {
  if (!filter) return {};

  const parsed = parseScimFilter(filter);
  if (!parsed) {
    throw new ScimServiceError("INVALID_FILTER", `Unsupported filter: ${filter}`, 400);
  }

  const { field, op, value } = parsed;

  if (field === "userName" || field === "emails.value") {
    switch (op) {
      case "eq":
        return { email: value };
      case "co":
        return { email: { contains: value, mode: "insensitive" as const } };
      case "sw":
        return { email: { startsWith: value, mode: "insensitive" as const } };
      default:
        throw new ScimServiceError("INVALID_FILTER", `Unsupported operator: ${op}`, 400);
    }
  }

  if (field === "externalId") {
    if (op === "eq") return { scimExternalId: value };
    throw new ScimServiceError(
      "INVALID_FILTER",
      `Only eq operator is supported for externalId`,
      400,
    );
  }

  if (field === "displayName") {
    switch (op) {
      case "eq":
        return { name: value };
      case "co":
        return { name: { contains: value, mode: "insensitive" as const } };
      case "sw":
        return { name: { startsWith: value, mode: "insensitive" as const } };
      default:
        throw new ScimServiceError("INVALID_FILTER", `Unsupported operator: ${op}`, 400);
    }
  }

  throw new ScimServiceError("INVALID_FILTER", `Unsupported filter field: ${field}`, 400);
}

function buildGroupWhere(filter?: string) {
  if (!filter) return {};

  const parsed = parseScimFilter(filter);
  if (!parsed) {
    throw new ScimServiceError("INVALID_FILTER", `Unsupported filter: ${filter}`, 400);
  }

  const { field, op, value } = parsed;

  if (field === "displayName") {
    switch (op) {
      case "eq":
        return { name: value };
      case "co":
        return { name: { contains: value, mode: "insensitive" as const } };
      case "sw":
        return { name: { startsWith: value, mode: "insensitive" as const } };
      default:
        throw new ScimServiceError("INVALID_FILTER", `Unsupported operator: ${op}`, 400);
    }
  }

  throw new ScimServiceError("INVALID_FILTER", `Unsupported filter field: ${field}`, 400);
}

// ── Token Management ────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

export async function createScimToken(input: ScimTokenCreateInput, createdById: string) {
  const plainToken = `scim_${crypto.randomBytes(32).toString("hex")}`;
  const tokenHash = await hash(plainToken, BCRYPT_ROUNDS);

  const token = await prisma.scimToken.create({
    data: {
      name: input.name,
      tokenHash,
      createdById,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      expiresAt: true,
      isActive: true,
    },
  });

  logger.info({ tokenId: token.id, name: input.name }, "SCIM token created");

  return { ...token, plainToken };
}

export async function listScimTokens(input: ScimTokenListInput) {
  const tokens = await prisma.scimToken.findMany({
    where: input.cursor ? { id: { gt: input.cursor } } : undefined,
    take: input.limit + 1,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const hasMore = tokens.length > input.limit;
  const items = hasMore ? tokens.slice(0, input.limit) : tokens;
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

  return { items, nextCursor };
}

export async function revokeScimToken(tokenId: string) {
  const token = await prisma.scimToken.findUnique({
    where: { id: tokenId },
    select: { id: true },
  });

  if (!token) {
    throw new ScimServiceError("TOKEN_NOT_FOUND", "SCIM token not found", 404);
  }

  await prisma.scimToken.update({
    where: { id: tokenId },
    data: { isActive: false },
  });

  logger.info({ tokenId }, "SCIM token revoked");
  return { success: true };
}

export async function validateScimToken(bearerToken: string): Promise<boolean> {
  const activeTokens = await prisma.scimToken.findMany({
    where: { isActive: true },
    select: { id: true, tokenHash: true, expiresAt: true },
  });

  for (const token of activeTokens) {
    if (token.expiresAt && token.expiresAt < new Date()) {
      continue;
    }

    const matches = await compare(bearerToken, token.tokenHash);
    if (matches) {
      await prisma.scimToken.update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
      });
      return true;
    }
  }

  return false;
}

export async function getScimStats() {
  const [tokenCount, provisionedUserCount, lastToken] = await Promise.all([
    prisma.scimToken.count({ where: { isActive: true } }),
    prisma.user.count({ where: { scimExternalId: { not: null } } }),
    prisma.scimToken.findFirst({
      where: { isActive: true },
      orderBy: { lastUsedAt: "desc" },
      select: { lastUsedAt: true },
    }),
  ]);

  return {
    activeTokens: tokenCount,
    provisionedUsers: provisionedUserCount,
    lastSyncAt: lastToken?.lastUsedAt?.toISOString() ?? null,
  };
}

// ── SCIM User Operations ────────────────────────────────────────

function extractEmailFromPayload(payload: ScimUserPayload): string {
  if (payload.emails && payload.emails.length > 0) {
    const primary = payload.emails.find((e) => e.primary);
    return primary?.value ?? payload.emails[0].value;
  }
  return payload.userName;
}

function extractNameFromPayload(payload: ScimUserPayload): string | null {
  if (payload.displayName) return payload.displayName;
  if (payload.name?.formatted) return payload.name.formatted;
  if (payload.name?.givenName && payload.name?.familyName) {
    return `${payload.name.givenName} ${payload.name.familyName}`;
  }
  return null;
}

export async function createScimUser(payload: ScimUserPayload) {
  const email = extractEmailFromPayload(payload);
  const name = extractNameFromPayload(payload);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ScimServiceError(
      "USER_ALREADY_EXISTS",
      `User with email ${email} already exists`,
      409,
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      scimExternalId: payload.externalId ?? null,
      globalRole: GlobalRole.MEMBER,
      isActive: payload.active,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      scimExternalId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  eventBus.emit("scim.userProvisioned", {
    entity: "user",
    entityId: user.id,
    actor: "scim",
    timestamp: new Date().toISOString(),
    metadata: { email, externalId: payload.externalId },
  });

  logger.info({ userId: user.id, email }, "SCIM user provisioned");
  return toScimUser(user);
}

export async function getScimUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      scimExternalId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ScimServiceError("USER_NOT_FOUND", "User not found", 404);
  }

  return toScimUser(user);
}

export async function listScimUsers(query: ScimListQuery) {
  const where = buildUserWhere(query.filter);
  const skip = query.startIndex - 1;

  const [users, totalResults] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: query.count,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        scimExternalId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults,
    startIndex: query.startIndex,
    itemsPerPage: users.length,
    Resources: users.map(toScimUser),
  };
}

export async function updateScimUser(userId: string, payload: ScimUserPayload) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!existing) {
    throw new ScimServiceError("USER_NOT_FOUND", "User not found", 404);
  }

  const email = extractEmailFromPayload(payload);
  const name = extractNameFromPayload(payload);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      name,
      scimExternalId: payload.externalId ?? null,
      isActive: payload.active,
    },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      scimExternalId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ userId, email }, "SCIM user updated (full replace)");
  return toScimUser(user);
}

export async function patchScimUser(userId: string, patchRequest: ScimPatchRequest) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isActive: true, scimExternalId: true },
  });

  if (!existing) {
    throw new ScimServiceError("USER_NOT_FOUND", "User not found", 404);
  }

  const data: Record<string, unknown> = {};

  for (const op of patchRequest.Operations) {
    if (op.op === "replace") {
      if (op.path === "active" && typeof op.value === "boolean") {
        data.isActive = op.value;
      } else if (op.path === "userName" && typeof op.value === "string") {
        data.email = op.value;
      } else if (op.path === "displayName" && typeof op.value === "string") {
        data.name = op.value;
      } else if (op.path === "externalId" && typeof op.value === "string") {
        data.scimExternalId = op.value;
      } else if (!op.path && typeof op.value === "object" && op.value !== null) {
        const attrs = op.value as Record<string, unknown>;
        if (typeof attrs.active === "boolean") data.isActive = attrs.active;
        if (typeof attrs.userName === "string") data.email = attrs.userName;
        if (typeof attrs.displayName === "string") data.name = attrs.displayName;
        if (typeof attrs.externalId === "string") data.scimExternalId = attrs.externalId;
      }
    } else if (op.op === "add") {
      if (op.path === "externalId" && typeof op.value === "string") {
        data.scimExternalId = op.value;
      }
    } else if (op.op === "remove") {
      if (op.path === "externalId") {
        data.scimExternalId = null;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        scimExternalId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return toScimUser(user!);
  }

  const wasActive = existing.isActive;
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      scimExternalId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (wasActive && !user.isActive) {
    eventBus.emit("scim.userDeprovisioned", {
      entity: "user",
      entityId: user.id,
      actor: "scim",
      timestamp: new Date().toISOString(),
      metadata: { email: user.email },
    });

    await prisma.session.deleteMany({ where: { userId: user.id } });
    logger.info({ userId }, "SCIM user deprovisioned, sessions invalidated");
  } else {
    logger.info({ userId }, "SCIM user patched");
  }

  return toScimUser(user);
}

export async function deleteScimUser(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!existing) {
    throw new ScimServiceError("USER_NOT_FOUND", "User not found", 404);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await prisma.session.deleteMany({ where: { userId } });

  eventBus.emit("scim.userDeprovisioned", {
    entity: "user",
    entityId: userId,
    actor: "scim",
    timestamp: new Date().toISOString(),
    metadata: { email: existing.email },
  });

  logger.info({ userId }, "SCIM user deleted (deactivated)");
}

// ── SCIM Group Operations ───────────────────────────────────────

export async function createScimGroup(payload: ScimGroupPayload) {
  const existing = await prisma.userGroup.findUnique({
    where: { name: payload.displayName },
  });

  if (existing) {
    throw new ScimServiceError(
      "GROUP_ALREADY_EXISTS",
      `Group with name ${payload.displayName} already exists`,
      409,
    );
  }

  const group = await prisma.userGroup.create({
    data: {
      name: payload.displayName,
    },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  if (payload.members && payload.members.length > 0) {
    await prisma.userGroupMembership.createMany({
      data: payload.members.map((m) => ({
        groupId: group.id,
        userId: m.value,
      })),
      skipDuplicates: true,
    });
  }

  const result = await prisma.userGroup.findUnique({
    where: { id: group.id },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  eventBus.emit("scim.groupSynced", {
    entity: "group",
    entityId: group.id,
    actor: "scim",
    timestamp: new Date().toISOString(),
    metadata: { name: payload.displayName },
  });

  logger.info({ groupId: group.id, name: payload.displayName }, "SCIM group created");
  return toScimGroup(result!);
}

export async function getScimGroup(groupId: string) {
  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  if (!group) {
    throw new ScimServiceError("GROUP_NOT_FOUND", "Group not found", 404);
  }

  return toScimGroup(group);
}

export async function listScimGroups(query: ScimListQuery) {
  const where = buildGroupWhere(query.filter);
  const skip = query.startIndex - 1;

  const [groups, totalResults] = await Promise.all([
    prisma.userGroup.findMany({
      where,
      skip,
      take: query.count,
      orderBy: { createdAt: "asc" },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
        },
      },
    }),
    prisma.userGroup.count({ where }),
  ]);

  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults,
    startIndex: query.startIndex,
    itemsPerPage: groups.length,
    Resources: groups.map(toScimGroup),
  };
}

export async function updateScimGroup(groupId: string, payload: ScimGroupPayload) {
  const existing = await prisma.userGroup.findUnique({
    where: { id: groupId },
    select: { id: true },
  });

  if (!existing) {
    throw new ScimServiceError("GROUP_NOT_FOUND", "Group not found", 404);
  }

  await prisma.userGroup.update({
    where: { id: groupId },
    data: { name: payload.displayName },
  });

  await prisma.userGroupMembership.deleteMany({ where: { groupId } });

  if (payload.members && payload.members.length > 0) {
    await prisma.userGroupMembership.createMany({
      data: payload.members.map((m) => ({
        groupId,
        userId: m.value,
      })),
      skipDuplicates: true,
    });
  }

  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  eventBus.emit("scim.groupSynced", {
    entity: "group",
    entityId: groupId,
    actor: "scim",
    timestamp: new Date().toISOString(),
    metadata: { name: payload.displayName },
  });

  logger.info({ groupId, name: payload.displayName }, "SCIM group updated (full replace)");
  return toScimGroup(group!);
}

export async function patchScimGroup(groupId: string, patchRequest: ScimPatchRequest) {
  const existing = await prisma.userGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });

  if (!existing) {
    throw new ScimServiceError("GROUP_NOT_FOUND", "Group not found", 404);
  }

  for (const op of patchRequest.Operations) {
    if (op.op === "replace" && op.path === "displayName" && typeof op.value === "string") {
      await prisma.userGroup.update({
        where: { id: groupId },
        data: { name: op.value },
      });
    } else if (op.op === "add" && op.path === "members") {
      const members = Array.isArray(op.value) ? (op.value as Array<{ value: string }>) : [];
      if (members.length > 0) {
        await prisma.userGroupMembership.createMany({
          data: members.map((m) => ({ groupId, userId: m.value })),
          skipDuplicates: true,
        });
      }
    } else if (op.op === "remove" && op.path?.startsWith("members[value eq")) {
      const match = op.path.match(/members\[value eq "([^"]+)"\]/);
      if (match) {
        await prisma.userGroupMembership.deleteMany({
          where: { groupId, userId: match[1] },
        });
      }
    } else if (op.op === "remove" && op.path === "members") {
      const members = Array.isArray(op.value) ? (op.value as Array<{ value: string }>) : [];
      if (members.length > 0) {
        await prisma.userGroupMembership.deleteMany({
          where: { groupId, userId: { in: members.map((m) => m.value) } },
        });
      }
    }
  }

  const group = await prisma.userGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  eventBus.emit("scim.groupSynced", {
    entity: "group",
    entityId: groupId,
    actor: "scim",
    timestamp: new Date().toISOString(),
    metadata: { name: group!.name },
  });

  logger.info({ groupId }, "SCIM group patched");
  return toScimGroup(group!);
}

export async function deleteScimGroup(groupId: string) {
  const existing = await prisma.userGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true },
  });

  if (!existing) {
    throw new ScimServiceError("GROUP_NOT_FOUND", "Group not found", 404);
  }

  await prisma.userGroup.delete({ where: { id: groupId } });

  logger.info({ groupId, name: existing.name }, "SCIM group deleted");
}

// ── SCIM Discovery Endpoints ────────────────────────────────────

export function getServiceProviderConfig() {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://tools.ietf.org/html/rfc7644",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "OAuth Bearer Token",
        description: "Authentication scheme using the OAuth Bearer Token Standard",
        specUri: "https://www.rfc-editor.org/info/rfc6750",
        primary: true,
      },
    ],
  };
}

export function getSchemas() {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: 2,
    Resources: [
      {
        id: SCIM_USER_SCHEMA,
        name: "User",
        description: "User Account",
      },
      {
        id: SCIM_GROUP_SCHEMA,
        name: "Group",
        description: "Group",
      },
    ],
  };
}

export function getResourceTypes() {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: 2,
    Resources: [
      {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
        id: "User",
        name: "User",
        endpoint: "/api/scim/v2/Users",
        schema: SCIM_USER_SCHEMA,
      },
      {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
        id: "Group",
        name: "Group",
        endpoint: "/api/scim/v2/Groups",
        schema: SCIM_GROUP_SCHEMA,
      },
    ],
  };
}
