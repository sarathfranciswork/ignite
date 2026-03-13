import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type {
  IpWhitelistAddInput,
  IpWhitelistListInput,
  IpWhitelistToggleInput,
} from "./compliance.schemas";

const childLogger = logger.child({ service: "ip-whitelist" });

export class IpWhitelistServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "IpWhitelistServiceError";
  }
}

function parseCidr(cidr: string): { ip: number[]; prefixLen: number } | null {
  const parts = cidr.split("/");
  if (parts.length !== 2) return null;

  const ipParts = parts[0].split(".").map(Number);
  const prefixLen = parseInt(parts[1], 10);

  if (ipParts.length !== 4 || ipParts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) {
    return null;
  }

  return { ip: ipParts, prefixLen };
}

function ipToNumber(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const parsed = parseCidr(cidr);
  if (!parsed) return false;

  const ipParts = ip.split(".").map(Number);
  if (ipParts.length !== 4 || ipParts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const ipNum = ipToNumber(ipParts);
  const cidrNum = ipToNumber(parsed.ip);
  const mask = parsed.prefixLen === 0 ? 0 : (~0 << (32 - parsed.prefixLen)) >>> 0;

  return (ipNum & mask) === (cidrNum & mask);
}

export async function addIpRange(input: IpWhitelistAddInput, userId: string) {
  const parsed = parseCidr(input.cidr);
  if (!parsed) {
    throw new IpWhitelistServiceError("Invalid CIDR notation", "INVALID_CIDR");
  }

  const existing = await prisma.ipWhitelist.findFirst({
    where: { spaceId: input.spaceId, cidr: input.cidr },
  });
  if (existing) {
    throw new IpWhitelistServiceError("This CIDR range is already whitelisted", "DUPLICATE_RANGE");
  }

  const entry = await prisma.ipWhitelist.create({
    data: {
      spaceId: input.spaceId,
      cidr: input.cidr,
      description: input.description ?? null,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info(
    { entryId: entry.id, cidr: input.cidr, spaceId: input.spaceId },
    "IP range added",
  );

  eventBus.emit("ipWhitelist.updated", {
    entity: "IpWhitelist",
    entityId: entry.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { action: "added", cidr: input.cidr, spaceId: input.spaceId },
  });

  return entry;
}

export async function removeIpRange(id: string, userId: string) {
  const existing = await prisma.ipWhitelist.findUnique({ where: { id } });
  if (!existing) {
    throw new IpWhitelistServiceError("IP range not found", "NOT_FOUND");
  }

  await prisma.ipWhitelist.delete({ where: { id } });

  childLogger.info({ entryId: id, userId }, "IP range removed");

  eventBus.emit("ipWhitelist.updated", {
    entity: "IpWhitelist",
    entityId: id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { action: "removed", cidr: existing.cidr },
  });
}

export async function listIpRanges(input: IpWhitelistListInput) {
  const items = await prisma.ipWhitelist.findMany({
    where: { spaceId: input.spaceId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { items };
}

export async function checkIp(spaceId: string, ip: string): Promise<boolean> {
  const whitelistEntries = await prisma.ipWhitelist.findMany({
    where: { spaceId, isActive: true },
    select: { cidr: true },
  });

  if (whitelistEntries.length === 0) {
    return true;
  }

  return whitelistEntries.some((entry) => isIpInCidr(ip, entry.cidr));
}

export async function toggleIpRange(input: IpWhitelistToggleInput, userId: string) {
  const existing = await prisma.ipWhitelist.findUnique({ where: { id: input.id } });
  if (!existing) {
    throw new IpWhitelistServiceError("IP range not found", "NOT_FOUND");
  }

  const updated = await prisma.ipWhitelist.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  childLogger.info({ entryId: input.id, isActive: input.isActive, userId }, "IP range toggled");

  eventBus.emit("ipWhitelist.updated", {
    entity: "IpWhitelist",
    entityId: input.id,
    actor: userId,
    timestamp: new Date().toISOString(),
    metadata: { action: "toggled", isActive: input.isActive },
  });

  return updated;
}

export async function isIpWhitelistEnabled(spaceId: string): Promise<boolean> {
  const count = await prisma.ipWhitelist.count({
    where: { spaceId, isActive: true },
  });
  return count > 0;
}

export { isIpInCidr };
