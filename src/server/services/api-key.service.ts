import crypto from "crypto";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  ApiKeyCreateInput,
  ApiKeyListInput,
  ApiKeyRevokeInput,
  ApiKeyDeleteInput,
  ApiKeyGetByIdInput,
} from "./api-key.schemas";

export {
  apiKeyCreateInput,
  apiKeyListInput,
  apiKeyRevokeInput,
  apiKeyDeleteInput,
  apiKeyGetByIdInput,
} from "./api-key.schemas";

export type {
  ApiKeyCreateInput,
  ApiKeyListInput,
  ApiKeyRevokeInput,
  ApiKeyDeleteInput,
  ApiKeyGetByIdInput,
} from "./api-key.schemas";

const childLogger = logger.child({ service: "api-key" });

export class ApiKeyServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiKeyServiceError";
  }
}

function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const rawKey = `ign_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = rawKey.slice(0, 12);
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, prefix, hash };
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

interface SerializedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string | null; email: string };
}

function serializeApiKey(key: {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; name: string | null; email: string };
}): SerializedApiKey {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    scopes: key.scopes,
    isActive: key.isActive,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    createdById: key.createdById,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
    createdBy: key.createdBy
      ? { id: key.createdBy.id, name: key.createdBy.name, email: key.createdBy.email }
      : undefined,
  };
}

export async function createApiKey(
  input: ApiKeyCreateInput,
  userId: string,
): Promise<SerializedApiKey & { rawKey: string }> {
  const { rawKey, prefix, hash } = generateApiKey();

  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const apiKey = await prisma.apiKey.create({
    data: {
      name: input.name,
      keyPrefix: prefix,
      keyHash: hash,
      scopes: input.scopes,
      expiresAt,
      createdById: userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  childLogger.info({ apiKeyId: apiKey.id }, "API key created");

  eventBus.emit("apiKey.created", {
    entity: "apiKey",
    entityId: apiKey.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return { ...serializeApiKey(apiKey), rawKey };
}

export async function getApiKey(input: ApiKeyGetByIdInput): Promise<SerializedApiKey> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: input.id },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!apiKey) {
    throw new ApiKeyServiceError("API_KEY_NOT_FOUND", "API key not found");
  }

  return serializeApiKey(apiKey);
}

export async function listApiKeys(
  input: ApiKeyListInput,
): Promise<{ items: SerializedApiKey[]; nextCursor?: string }> {
  const { cursor, limit, isActive } = input;

  const keys = await prisma.apiKey.findMany({
    where: {
      ...(isActive !== undefined ? { isActive } : {}),
    },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  let nextCursor: string | undefined;
  if (keys.length > limit) {
    const next = keys.pop();
    nextCursor = next?.id;
  }

  return {
    items: keys.map(serializeApiKey),
    nextCursor,
  };
}

export async function revokeApiKey(
  input: ApiKeyRevokeInput,
  userId: string,
): Promise<SerializedApiKey> {
  const existing = await prisma.apiKey.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new ApiKeyServiceError("API_KEY_NOT_FOUND", "API key not found");
  }

  if (!existing.isActive) {
    throw new ApiKeyServiceError("API_KEY_ALREADY_REVOKED", "API key is already revoked");
  }

  const apiKey = await prisma.apiKey.update({
    where: { id: input.id },
    data: { isActive: false },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  childLogger.info({ apiKeyId: apiKey.id }, "API key revoked");

  eventBus.emit("apiKey.revoked", {
    entity: "apiKey",
    entityId: apiKey.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return serializeApiKey(apiKey);
}

export async function deleteApiKey(
  input: ApiKeyDeleteInput,
  userId: string,
): Promise<{ id: string }> {
  const existing = await prisma.apiKey.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new ApiKeyServiceError("API_KEY_NOT_FOUND", "API key not found");
  }

  await prisma.apiKey.delete({ where: { id: input.id } });

  childLogger.info({ apiKeyId: input.id }, "API key deleted");

  eventBus.emit("apiKey.deleted", {
    entity: "apiKey",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
  });

  return { id: input.id };
}

export async function validateApiKey(
  rawKey: string,
): Promise<{ userId: string; scopes: string[] } | null> {
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { createdBy: { select: { id: true, globalRole: true } } },
  });

  if (!apiKey) return null;
  if (!apiKey.isActive) return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    userId: apiKey.createdById,
    scopes: apiKey.scopes,
  };
}

export function getAvailableScopes(): string[] {
  return [
    "campaigns:read",
    "ideas:read",
    "users:read",
    "channels:read",
    "evaluations:read",
    "organizations:read",
    "activity:read",
  ];
}
