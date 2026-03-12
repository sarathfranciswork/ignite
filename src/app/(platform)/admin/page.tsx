"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Lightbulb,
  Activity,
  Server,
  Mail,
  HardDrive,
  Database,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  subStats,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href?: string;
  subStats?: Array<{ label: string; value: number }>;
}) {
  const content = (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subStats && (
            <div className="mt-2 flex gap-3">
              {subStats.map((sub) => (
                <span key={sub.label} className="text-xs text-gray-500">
                  {sub.label}:{" "}
                  <span className="font-medium text-gray-700">{sub.value.toLocaleString()}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Icon className="h-5 w-5 text-primary-600" />
        </div>
      </div>
      {href && (
        <div className="mt-3 flex items-center text-xs font-medium text-primary-600">
          View details <ArrowRight className="ml-1 h-3 w-3" />
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function ServiceStatusBadge({ status }: { status: "ok" | "error" | "degraded" | "skipped" }) {
  const variantMap: Record<string, "default" | "success" | "warning" | "destructive"> = {
    ok: "success",
    degraded: "warning",
    error: "destructive",
    skipped: "default",
  };

  return <Badge variant={variantMap[status] ?? "default"}>{status.toUpperCase()}</Badge>;
}

export default function AdminDashboardPage() {
  const { data: overview, isLoading } = trpc.admin.systemOverview.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <LayoutDashboard className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">System overview and platform health</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  const stats = overview?.stats;
  const health = overview?.health;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <LayoutDashboard className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System overview and platform health</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats?.users.total ?? 0}
          icon={Users}
          href="/admin/users"
          subStats={[
            { label: "Active", value: stats?.users.active ?? 0 },
            { label: "Inactive", value: stats?.users.inactive ?? 0 },
          ]}
        />
        <StatCard
          label="Campaigns"
          value={stats?.campaigns.total ?? 0}
          icon={Megaphone}
          subStats={[{ label: "Active", value: stats?.campaigns.active ?? 0 }]}
        />
        <StatCard label="Ideas" value={stats?.ideas.total ?? 0} icon={Lightbulb} />
        <StatCard
          label="Eval Sessions"
          value={stats?.evaluationSessions.total ?? 0}
          icon={Activity}
        />
      </div>

      {/* System Services */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">System Services</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Database</span>
              </div>
              <ServiceStatusBadge status={health?.checks.database.status ?? "skipped"} />
            </div>
            {health?.checks.database.latency_ms !== undefined && (
              <p className="mt-1 text-xs text-gray-500">
                Latency: {health.checks.database.latency_ms}ms
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Redis</span>
              </div>
              <ServiceStatusBadge status={health?.checks.redis.status ?? "skipped"} />
            </div>
            {health?.checks.redis.latency_ms !== undefined && (
              <p className="mt-1 text-xs text-gray-500">
                Latency: {health.checks.redis.latency_ms}ms
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Storage (S3)</span>
              </div>
              <ServiceStatusBadge status={health?.checks.s3.status ?? "skipped"} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {overview?.storage.configured ? "Configured" : "Not configured"}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">SMTP</span>
              </div>
              <Badge variant={overview?.smtp.configured ? "success" : "default"}>
                {overview?.smtp.configured ? "CONFIGURED" : "NOT SET"}
              </Badge>
            </div>
            {overview?.smtp.fromAddress && (
              <p className="mt-1 text-xs text-gray-500">From: {overview.smtp.fromAddress}</p>
            )}
          </Card>
        </div>
      </div>

      {/* System Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Memory Usage</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Heap Used</span>
              <span className="font-medium text-gray-700">
                {health?.memory.heap_used_mb ?? 0} MB
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Heap Total</span>
              <span className="font-medium text-gray-700">
                {health?.memory.heap_total_mb ?? 0} MB
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-primary-500"
                style={{
                  width: `${Math.min(((health?.memory.heap_used_mb ?? 0) / Math.max(health?.memory.heap_total_mb ?? 1, 1)) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">User Distribution</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Admins</span>
              <span className="font-medium text-gray-700">{stats?.users.admins ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Innovation Managers</span>
              <span className="font-medium text-gray-700">{stats?.users.managers ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Members</span>
              <span className="font-medium text-gray-700">{stats?.users.members ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
