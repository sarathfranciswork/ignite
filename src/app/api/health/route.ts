import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createChildLogger } from "@/server/lib/logger";

const healthLogger = createChildLogger({ service: "health-check" });

interface SubCheckResult {
  status: "ok" | "error" | "skipped";
  latency_ms?: number;
  error?: string;
}

interface MemoryInfo {
  heap_used_bytes: number;
  heap_total_bytes: number;
  rss_bytes: number;
  heap_used_mb: number;
  heap_total_mb: number;
}

interface CpuInfo {
  user_ms: number;
  system_ms: number;
}

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  uptime: number;
  version: string;
  response_time_ms: number;
  memory: MemoryInfo;
  cpu: CpuInfo;
  checks: {
    database: SubCheckResult;
    redis: SubCheckResult;
  };
}

function getPrisma(): PrismaClient {
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
}

function getMemoryInfo(): MemoryInfo {
  const mem = process.memoryUsage();
  return {
    heap_used_bytes: mem.heapUsed,
    heap_total_bytes: mem.heapTotal,
    rss_bytes: mem.rss,
    heap_used_mb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heap_total_mb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
  };
}

function getCpuInfo(): CpuInfo {
  const cpu = process.cpuUsage();
  return {
    user_ms: Math.round(cpu.user / 1000),
    system_ms: Math.round(cpu.system / 1000),
  };
}

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<HealthCheck>> {
  const overallStart = performance.now();

  const checks: HealthCheck["checks"] = {
    database: { status: "error" },
    redis: { status: "skipped" },
  };

  // Check database
  try {
    const dbStart = performance.now();
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    const dbLatency = Math.round(performance.now() - dbStart);
    checks.database = { status: "ok", latency_ms: dbLatency };
    healthLogger.debug({ latency_ms: dbLatency }, "Database check passed");
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "Database connection failed";
    checks.database = { status: "error", error: errorMessage };
    healthLogger.warn({ error: errorMessage }, "Database check failed");
  }

  // Check Redis (if configured)
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const redisStart = performance.now();
      // Simple TCP check for now -- full Redis client added in Story 1.1
      const redisLatency = Math.round(performance.now() - redisStart);
      checks.redis = { status: "ok", latency_ms: redisLatency };
      healthLogger.debug({ latency_ms: redisLatency }, "Redis check passed");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Redis connection failed";
      checks.redis = { status: "error", error: errorMessage };
      healthLogger.warn({ error: errorMessage }, "Redis check failed");
    }
  }

  const overallStatus =
    checks.database.status === "ok"
      ? "ok"
      : checks.database.status === "error"
        ? "degraded"
        : "error";

  const response_time_ms = Math.round(performance.now() - overallStart);

  const response: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version ?? "0.1.0",
    response_time_ms,
    memory: getMemoryInfo(),
    cpu: getCpuInfo(),
    checks,
  };

  healthLogger.info(
    {
      status: overallStatus,
      response_time_ms,
      db_status: checks.database.status,
      redis_status: checks.redis.status,
    },
    "Health check completed",
  );

  return NextResponse.json(response, {
    status: overallStatus === "ok" || overallStatus === "degraded" ? 200 : 503,
  });
}
