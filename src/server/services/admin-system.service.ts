import { z } from "zod";
import { prisma } from "@/server/lib/prisma";
import { isRedisAvailable } from "@/server/lib/redis";
import { performHealthCheck } from "@/server/services/health.service";
import { createChildLogger } from "@/server/lib/logger";
import type { HealthCheckResult } from "@/server/services/health.service";

const serviceLogger = createChildLogger({ service: "admin-system" });

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

export const systemStatsInput = z.object({}).optional();

export const terminologyUpdateInput = z.object({
  campaign: z.string().min(1).max(50).optional(),
  idea: z.string().min(1).max(50).optional(),
  channel: z.string().min(1).max(50).optional(),
  evaluation: z.string().min(1).max(50).optional(),
  bucket: z.string().min(1).max(50).optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    managers: number;
    members: number;
  };
  campaigns: {
    total: number;
    active: number;
  };
  ideas: {
    total: number;
  };
  channels: {
    total: number;
  };
  evaluationSessions: {
    total: number;
  };
}

export interface SmtpStatus {
  configured: boolean;
  host: string | null;
  port: number | null;
  fromAddress: string | null;
}

export interface StorageStatus {
  configured: boolean;
  endpoint: string | null;
  bucket: string | null;
  region: string | null;
}

export interface SystemOverview {
  stats: SystemStats;
  smtp: SmtpStatus;
  storage: StorageStatus;
  redis: {
    configured: boolean;
  };
  health: HealthCheckResult;
}

export interface TerminologyConfig {
  campaign: string;
  idea: string;
  channel: string;
  evaluation: string;
  bucket: string;
}

const DEFAULT_TERMINOLOGY: TerminologyConfig = {
  campaign: "Campaign",
  idea: "Idea",
  channel: "Channel",
  evaluation: "Evaluation",
  bucket: "Bucket",
};

// In-memory terminology store (will be persisted to PlatformSettings table when available)
let currentTerminology: TerminologyConfig = { ...DEFAULT_TERMINOLOGY };

// ---------------------------------------------------------------------------
// Service Functions
// ---------------------------------------------------------------------------

export async function getSystemStats(): Promise<SystemStats> {
  const [
    totalUsers,
    activeUsers,
    adminUsers,
    managerUsers,
    totalCampaigns,
    activeCampaigns,
    totalIdeas,
    totalChannels,
    totalEvaluations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { globalRole: "PLATFORM_ADMIN" } }),
    prisma.user.count({ where: { globalRole: "INNOVATION_MANAGER" } }),
    prisma.campaign.count(),
    prisma.campaign.count({
      where: {
        status: { in: ["SUBMISSION", "DISCUSSION_VOTING", "EVALUATION"] },
      },
    }),
    prisma.idea.count(),
    prisma.channel.count(),
    prisma.evaluationSession.count(),
  ]);

  const stats: SystemStats = {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      admins: adminUsers,
      managers: managerUsers,
      members: totalUsers - adminUsers - managerUsers,
    },
    campaigns: {
      total: totalCampaigns,
      active: activeCampaigns,
    },
    ideas: {
      total: totalIdeas,
    },
    channels: {
      total: totalChannels,
    },
    evaluationSessions: {
      total: totalEvaluations,
    },
  };

  serviceLogger.debug({ stats }, "System stats retrieved");
  return stats;
}

export function getSmtpStatus(): SmtpStatus {
  const host = process.env.SMTP_HOST ?? process.env.EMAIL_SERVER_HOST ?? null;
  const portStr = process.env.SMTP_PORT ?? process.env.EMAIL_SERVER_PORT ?? null;
  const fromAddress = process.env.EMAIL_FROM ?? process.env.SMTP_FROM ?? null;

  return {
    configured: !!host,
    host: host ? maskSensitive(host) : null,
    port: portStr ? parseInt(portStr, 10) : null,
    fromAddress,
  };
}

export function getStorageStatus(): StorageStatus {
  const endpoint = process.env.S3_ENDPOINT ?? null;
  const bucket = process.env.S3_BUCKET ?? null;
  const region = process.env.S3_REGION ?? null;

  return {
    configured: !!endpoint && !!bucket,
    endpoint: endpoint ? maskSensitive(endpoint) : null,
    bucket,
    region,
  };
}

export async function getSystemOverview(): Promise<SystemOverview> {
  const [stats, health] = await Promise.all([getSystemStats(), performHealthCheck()]);

  return {
    stats,
    smtp: getSmtpStatus(),
    storage: getStorageStatus(),
    redis: {
      configured: isRedisAvailable(),
    },
    health,
  };
}

export function getTerminology(): TerminologyConfig {
  return { ...currentTerminology };
}

export function updateTerminology(
  input: z.infer<typeof terminologyUpdateInput>,
): TerminologyConfig {
  if (input.campaign) currentTerminology.campaign = input.campaign;
  if (input.idea) currentTerminology.idea = input.idea;
  if (input.channel) currentTerminology.channel = input.channel;
  if (input.evaluation) currentTerminology.evaluation = input.evaluation;
  if (input.bucket) currentTerminology.bucket = input.bucket;

  serviceLogger.info({ terminology: currentTerminology }, "Terminology updated");
  return { ...currentTerminology };
}

export function resetTerminology(): TerminologyConfig {
  currentTerminology = { ...DEFAULT_TERMINOLOGY };
  serviceLogger.info("Terminology reset to defaults");
  return { ...currentTerminology };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskSensitive(value: string): string {
  // Only show protocol + first part of hostname for security
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    // Not a URL, mask middle characters
    if (value.length <= 4) return value;
    return value.slice(0, 2) + "***" + value.slice(-2);
  }
}
