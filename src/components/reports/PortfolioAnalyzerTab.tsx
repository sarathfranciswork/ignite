"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/charts/KpiCard";
import { Button } from "@/components/ui/button";
import { FolderKanban, CheckCircle2, Clock, TrendingUp, GitBranch } from "lucide-react";
import { ProcessAnalysisPanel } from "./ProcessAnalysisPanel";
import { PortfolioMatrixChart } from "./PortfolioMatrixChart";
import { StatusDistributionChart } from "./StatusDistributionChart";

type SubTabId = "overview" | "process" | "matrix";

export function PortfolioAnalyzerTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>("overview");
  const [processDefFilter, setProcessDefFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const overviewQuery = trpc.portfolioAnalyzer.overview.useQuery({
    processDefinitionId: processDefFilter || undefined,
    status: statusFilter
      ? (statusFilter as "ACTIVE" | "ON_HOLD" | "COMPLETED" | "TERMINATED")
      : undefined,
  });

  const processDefsQuery = trpc.processDefinition.list.useQuery({
    limit: 100,
    sortBy: "name",
    sortDirection: "asc",
  });

  const subTabs: { id: SubTabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "process", label: "Process Analysis" },
    { id: "matrix", label: "Project Matrix" },
  ];

  const overview = overviewQuery.data;
  const processDefs = (processDefsQuery.data?.items ?? []) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={processDefFilter}
          onChange={(e) => setProcessDefFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">All process definitions</option>
          {processDefs.map((pd) => (
            <option key={pd.id} value={pd.id}>
              {pd.name}
            </option>
          ))}
        </select>
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
      </div>

      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {subTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeSubTab === tab.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveSubTab(tab.id)}
            className="flex-1"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeSubTab === "overview" && (
        <OverviewSection
          overview={overview}
          isLoading={overviewQuery.isLoading}
          isError={overviewQuery.isError}
        />
      )}

      {activeSubTab === "process" && (
        <ProcessSection
          processDefFilter={processDefFilter}
          processDefs={processDefs}
          isLoading={processDefsQuery.isLoading}
        />
      )}

      {activeSubTab === "matrix" && (
        <PortfolioMatrixChart
          processDefinitionId={processDefFilter || undefined}
          status={
            statusFilter
              ? (statusFilter as "ACTIVE" | "ON_HOLD" | "COMPLETED" | "TERMINATED")
              : undefined
          }
        />
      )}
    </div>
  );
}

interface OverviewData {
  totalProjects: number;
  statusCounts: {
    ACTIVE: number;
    ON_HOLD: number;
    COMPLETED: number;
    TERMINATED: number;
  };
  projectsByProcessDef: { id: string; name: string; projectCount: number }[];
  averageTimeDays: number | null;
  gatePassRate: number | null;
  completionRate: number | null;
}

function OverviewSection({
  overview,
  isLoading,
  isError,
}: {
  overview: OverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load portfolio overview. Please try again.</p>
      </div>
    );
  }

  if (!overview) return null;

  if (overview.totalProjects === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">No projects found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Create projects to see portfolio analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Projects" value={overview.totalProjects} icon={FolderKanban} />
        <KpiCard
          title="Completion Rate"
          value={overview.completionRate !== null ? `${overview.completionRate}%` : "N/A"}
          icon={CheckCircle2}
          trend={
            overview.completionRate !== null
              ? overview.completionRate >= 50
                ? "up"
                : "down"
              : "neutral"
          }
        />
        <KpiCard
          title="Gate Pass Rate"
          value={overview.gatePassRate !== null ? `${overview.gatePassRate}%` : "N/A"}
          icon={GitBranch}
          trend={
            overview.gatePassRate !== null
              ? overview.gatePassRate >= 70
                ? "up"
                : "down"
              : "neutral"
          }
        />
        <KpiCard
          title="Avg. Duration"
          value={overview.averageTimeDays !== null ? `${overview.averageTimeDays}d` : "N/A"}
          subtitle="completed projects"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusDistributionChart statusCounts={overview.statusCounts} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900">Projects by Process Definition</h3>
          <div className="mt-4 space-y-3">
            {overview.projectsByProcessDef.length === 0 && (
              <p className="text-sm text-gray-400">No process definitions found</p>
            )}
            {overview.projectsByProcessDef.map((pd) => {
              const widthPercent = Math.max((pd.projectCount / overview.totalProjects) * 100, 8);
              return (
                <div key={pd.id} className="flex items-center gap-3">
                  <div className="w-32 truncate text-right text-xs font-medium text-gray-600">
                    {pd.name}
                  </div>
                  <div className="flex-1">
                    <div
                      className="flex h-7 items-center rounded-md bg-primary-500 px-3 text-xs font-bold text-white transition-all"
                      style={{ width: `${widthPercent}%` }}
                    >
                      {pd.projectCount}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessSection({
  processDefFilter,
  processDefs,
  isLoading,
}: {
  processDefFilter: string;
  processDefs: { id: string; name: string }[];
  isLoading: boolean;
}) {
  const [selectedProcessDef, setSelectedProcessDef] = useState<string>(processDefFilter);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />;
  }

  if (processDefs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
          No process definitions
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Create process definitions to see phase analysis.
        </p>
      </div>
    );
  }

  const activeId = selectedProcessDef || processDefs[0]?.id || "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {processDefs.map((pd) => (
          <Button
            key={pd.id}
            variant={activeId === pd.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedProcessDef(pd.id)}
          >
            {pd.name}
          </Button>
        ))}
      </div>

      {activeId && <ProcessAnalysisPanel processDefinitionId={activeId} />}
    </div>
  );
}
