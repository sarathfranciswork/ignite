"use client";

import * as React from "react";
import {
  Activity,
  Database,
  Server,
  HardDrive,
  RefreshCw,
  Clock,
  Cpu,
  MemoryStick,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

function StatusBadge({ status }: { status: "ok" | "error" | "degraded" | "skipped" }) {
  const variantMap: Record<string, "success" | "destructive" | "warning" | "default"> = {
    ok: "success",
    error: "destructive",
    degraded: "warning",
    skipped: "default",
  };

  return <Badge variant={variantMap[status] ?? "default"}>{status.toUpperCase()}</Badge>;
}

function ServiceCard({
  name,
  icon: Icon,
  status,
  latencyMs,
  error,
}: {
  name: string;
  icon: React.ElementType;
  status: "ok" | "error" | "skipped";
  latencyMs?: number;
  error?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
            {latencyMs !== undefined && (
              <p className="text-xs text-gray-500">Response: {latencyMs}ms</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 p-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </Card>
  );
}

export default function AdminHealthPage() {
  const utils = trpc.useUtils();
  const { data: overview, isLoading } = trpc.admin.systemOverview.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const health = overview?.health;

  function handleRefresh() {
    void utils.admin.systemOverview.invalidate();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Activity className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">System Health</h1>
            <p className="text-sm text-gray-500">Real-time health monitoring and service status</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={health?.status ?? "skipped"} />
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service Checks */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Service Status</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ServiceCard
            name="PostgreSQL Database"
            icon={Database}
            status={health?.checks.database.status ?? "skipped"}
            latencyMs={health?.checks.database.latency_ms}
            error={health?.checks.database.error}
          />
          <ServiceCard
            name="Redis Cache"
            icon={Server}
            status={health?.checks.redis.status ?? "skipped"}
            latencyMs={health?.checks.redis.latency_ms}
            error={health?.checks.redis.error}
          />
          <ServiceCard
            name="Object Storage (S3)"
            icon={HardDrive}
            status={health?.checks.s3.status ?? "skipped"}
            latencyMs={health?.checks.s3.latency_ms}
            error={health?.checks.s3.error}
          />
        </div>
      </div>

      {/* System Resources */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">System Resources</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Memory</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-500">Heap Used</span>
                  <span className="font-medium">{health?.memory.heap_used_mb ?? 0} MB</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-primary-500 transition-all"
                    style={{
                      width: `${Math.min(((health?.memory.heap_used_mb ?? 0) / Math.max(health?.memory.heap_total_mb ?? 1, 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Heap Total</span>
                <span className="font-medium">{health?.memory.heap_total_mb ?? 0} MB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">RSS</span>
                <span className="font-medium">
                  {health?.memory.rss_bytes ? Math.round(health.memory.rss_bytes / 1024 / 1024) : 0}{" "}
                  MB
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">CPU</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">User Time</span>
                <span className="font-medium">{health?.cpu.user_ms ?? 0}ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">System Time</span>
                <span className="font-medium">{health?.cpu.system_ms ?? 0}ms</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Uptime</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Process Uptime</span>
                <span className="font-medium">
                  {health?.uptime ? formatDistanceToNow(Date.now() - health.uptime * 1000) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Version</span>
                <span className="font-medium">{health?.version ?? "0.1.0"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Response Time</span>
                <span className="font-medium">{health?.response_time_ms ?? 0}ms</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Platform Stats */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Platform Counts</h2>
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-sm text-gray-500">Users</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.stats.users.total ?? 0}</p>
              <p className="text-xs text-gray-500">{overview?.stats.users.active ?? 0} active</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview?.stats.campaigns.total ?? 0}
              </p>
              <p className="text-xs text-gray-500">
                {overview?.stats.campaigns.active ?? 0} active
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ideas</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.stats.ideas.total ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Channels</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview?.stats.channels.total ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Evaluations</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview?.stats.evaluationSessions.total ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Storage Configuration */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Storage Configuration</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Object Storage (S3)</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge variant={overview?.storage.configured ? "success" : "default"}>
                  {overview?.storage.configured ? "CONFIGURED" : "NOT CONFIGURED"}
                </Badge>
              </div>
              {overview?.storage.endpoint && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Endpoint</span>
                  <span className="font-medium text-gray-700">{overview.storage.endpoint}</span>
                </div>
              )}
              {overview?.storage.bucket && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bucket</span>
                  <span className="font-medium text-gray-700">{overview.storage.bucket}</span>
                </div>
              )}
              {overview?.storage.region && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Region</span>
                  <span className="font-medium text-gray-700">{overview.storage.region}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">SMTP Email</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status</span>
                <Badge variant={overview?.smtp.configured ? "success" : "default"}>
                  {overview?.smtp.configured ? "CONFIGURED" : "NOT CONFIGURED"}
                </Badge>
              </div>
              {overview?.smtp.host && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Host</span>
                  <span className="font-medium text-gray-700">{overview.smtp.host}</span>
                </div>
              )}
              {overview?.smtp.port && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Port</span>
                  <span className="font-medium text-gray-700">{overview.smtp.port}</span>
                </div>
              )}
              {overview?.smtp.fromAddress && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">From Address</span>
                  <span className="font-medium text-gray-700">{overview.smtp.fromAddress}</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Last Check Timestamp */}
      {health?.timestamp && (
        <p className="text-xs text-gray-400">
          Last check: {new Date(health.timestamp).toLocaleString()}
        </p>
      )}
    </div>
  );
}
