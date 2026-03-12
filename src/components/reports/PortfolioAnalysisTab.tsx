"use client";

import { trpc } from "@/lib/trpc";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { FolderKanban } from "lucide-react";

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      ))}
    </div>
  );
}

const PHASE_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#C084FC",
  "#D8B4FE",
  "#E9D5FF",
  "#818CF8",
  "#A78BFA",
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22C55E",
  COMPLETED: "#6366F1",
  TERMINATED: "#EF4444",
  ON_HOLD: "#F59E0B",
};

export function PortfolioAnalysisTab() {
  const analysisQuery = trpc.report.portfolioAnalysis.useQuery({});

  if (analysisQuery.isLoading) {
    return <AnalysisSkeleton />;
  }

  if (analysisQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load portfolio analysis. Please try again.</p>
      </div>
    );
  }

  const data = analysisQuery.data;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-3 text-sm text-gray-500">
          No projects found. Create projects with process definitions to see portfolio analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((group) => (
          <div
            key={group.processDefinition.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                {group.processDefinition.name}
              </h4>
              <span className="text-2xl font-bold text-gray-900">{group.totalProjects}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {group.totalProjects === 1 ? "project" : "projects"}
            </p>
          </div>
        ))}
      </div>

      {data.map((group) => {
        const statusSteps = Object.entries(group.statusBreakdown).map(([status, count]) => ({
          label: formatStatus(status),
          value: count,
          color: STATUS_COLORS[status] ?? "#6B7280",
        }));

        const phaseSteps = group.phaseDistribution.map((phase, index) => ({
          label: phase.phaseName,
          value: phase.projectCount,
          color: PHASE_COLORS[index % PHASE_COLORS.length] ?? "#6B7280",
        }));

        return (
          <div
            key={group.processDefinition.id}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              {group.processDefinition.name}
            </h3>
            <div className="grid gap-6 lg:grid-cols-2">
              {statusSteps.length > 0 && (
                <div>
                  <h4 className="mb-3 text-xs font-medium text-gray-500">By Status</h4>
                  <FunnelChart steps={statusSteps} />
                </div>
              )}
              {phaseSteps.length > 0 && (
                <div>
                  <h4 className="mb-3 text-xs font-medium text-gray-500">By Current Phase</h4>
                  <FunnelChart steps={phaseSteps} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
