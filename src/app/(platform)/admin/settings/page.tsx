"use client";

import * as React from "react";
import { Settings, Mail, HardDrive, Server, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function ConfigRow({
  label,
  value,
  configured,
}: {
  label: string;
  value: string | null;
  configured?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      {configured !== undefined ? (
        <Badge variant={configured ? "success" : "default"}>
          {configured ? "CONFIGURED" : "NOT SET"}
        </Badge>
      ) : (
        <span className="text-sm font-medium text-gray-700">{value ?? "Not set"}</span>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data: overview, isLoading } = trpc.admin.systemOverview.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
          <Settings className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500">Platform-wide configuration and service status</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Environment-based configuration</p>
            <p className="mt-1 text-xs text-blue-700">
              System settings are configured via environment variables following the 12-factor app
              methodology. Update your .env file or Docker Compose configuration to change these
              values.
            </p>
          </div>
        </div>
      </Card>

      {/* SMTP Configuration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Email (SMTP)</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <ConfigRow label="SMTP Server" value={null} configured={overview?.smtp.configured} />
          {overview?.smtp.host && <ConfigRow label="Host" value={overview.smtp.host} />}
          {overview?.smtp.port && <ConfigRow label="Port" value={String(overview.smtp.port)} />}
          <ConfigRow label="From Address" value={overview?.smtp.fromAddress ?? null} />
        </div>
        {!overview?.smtp.configured && (
          <p className="mt-3 text-xs text-gray-500">
            Set SMTP_HOST, SMTP_PORT, and EMAIL_FROM environment variables to enable email
            notifications.
          </p>
        )}
      </Card>

      {/* Storage Configuration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Object Storage (S3)</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <ConfigRow label="S3 Storage" value={null} configured={overview?.storage.configured} />
          {overview?.storage.endpoint && (
            <ConfigRow label="Endpoint" value={overview.storage.endpoint} />
          )}
          {overview?.storage.bucket && <ConfigRow label="Bucket" value={overview.storage.bucket} />}
          {overview?.storage.region && <ConfigRow label="Region" value={overview.storage.region} />}
        </div>
        {!overview?.storage.configured && (
          <p className="mt-3 text-xs text-gray-500">
            Set S3_ENDPOINT, S3_BUCKET, and S3_REGION environment variables to enable file storage.
          </p>
        )}
      </Card>

      {/* Redis Configuration */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Redis Cache</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <ConfigRow label="Redis" value={null} configured={overview?.redis.configured} />
        </div>
        {!overview?.redis.configured && (
          <p className="mt-3 text-xs text-gray-500">
            Set REDIS_URL environment variable to enable Redis-backed caching, sessions, and
            background jobs. In-memory fallback is active.
          </p>
        )}
      </Card>
    </div>
  );
}
