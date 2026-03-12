"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineView } from "@/components/projects/PipelineView";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { ArrowLeft, BarChart3, FolderKanban, Activity, CheckCircle2, Gauge } from "lucide-react";

const statusColorMap: Record<string, string> = {
  ACTIVE: "bg-green-500",
  ON_HOLD: "bg-yellow-500",
  COMPLETED: "bg-blue-500",
  TERMINATED: "bg-red-500",
};

const statusLabelMap: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
};

export default function ProjectDashboardPage() {
  const [processDefFilter, setProcessDefFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const dashboardQuery = trpc.project.dashboardStats.useQuery({
    processDefinitionId: processDefFilter || undefined,
    status: statusFilter
      ? (statusFilter as "ACTIVE" | "ON_HOLD" | "COMPLETED" | "TERMINATED")
      : undefined,
  });

  const processDefsQuery = trpc.processDefinition.list.useQuery({ limit: 100 });

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  const stats = dashboardQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <BarChart3 className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Project Dashboard</h1>
            <p className="text-sm text-gray-500">Portfolio overview and innovation pipeline</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="TERMINATED">Terminated</option>
        </select>
        <select
          value={processDefFilter}
          onChange={(e) => setProcessDefFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All process templates</option>
          {processDefsQuery.data?.items.map((pd) => (
            <option key={pd.id} value={pd.id}>
              {pd.name}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FolderKanban}
          label="Total Projects"
          value={stats?.totalProjects ?? 0}
          color="text-primary-600"
        />
        <KpiCard
          icon={Activity}
          label="Active Projects"
          value={stats?.totalActive ?? 0}
          color="text-green-600"
        />
        <KpiCard
          icon={Gauge}
          label="Phase Completion"
          value={`${stats?.phaseCompletionRate ?? 0}%`}
          color="text-amber-600"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value={stats?.byStatus.find((s) => s.status === "COMPLETED")?.count ?? 0}
          color="text-blue-600"
        />
      </div>

      {/* Status Distribution */}
      {stats && stats.byStatus.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-gray-900">Projects by Status</h2>
            <div className="mt-4 space-y-3">
              {stats.byStatus.map((entry) => {
                const pct =
                  stats.totalProjects > 0
                    ? Math.round((entry.count / stats.totalProjects) * 100)
                    : 0;
                return (
                  <div key={entry.status}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">
                        {statusLabelMap[entry.status] ?? entry.status}
                      </span>
                      <span className="font-medium text-gray-900">
                        {entry.count} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${statusColorMap[entry.status] ?? "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-gray-900">
              By Process Template
            </h2>
            <div className="mt-4 space-y-3">
              {stats.byProcessDefinition.length === 0 ? (
                <p className="text-sm text-gray-500">No data available</p>
              ) : (
                stats.byProcessDefinition.map((entry) => (
                  <div
                    key={entry.processDefinitionId}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                  >
                    <span className="text-sm text-gray-700">{entry.processDefinitionName}</span>
                    <Badge variant="outline">{entry.count}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Pipeline View */}
      <PipelineView />

      {/* Timeline */}
      {stats && stats.timeline.length > 0 && <ProjectTimeline projects={stats.timeline} />}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-gray-50 p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}
