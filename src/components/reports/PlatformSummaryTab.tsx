"use client";

import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/charts/KpiCard";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { Briefcase, Lightbulb, FolderKanban, Users } from "lucide-react";

function SummarySkeleton() {
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
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}

export function PlatformSummaryTab() {
  const summaryQuery = trpc.report.platformSummary.useQuery({});

  if (summaryQuery.isLoading) {
    return <SummarySkeleton />;
  }

  if (summaryQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load platform summary. Please try again.</p>
      </div>
    );
  }

  const data = summaryQuery.data;
  if (!data) return <SummarySkeleton />;

  const campaignFunnel = Object.entries(data.campaignStatusBreakdown).map(
    ([status, count], index) => ({
      label: formatStatus(status),
      value: count,
      color: CAMPAIGN_COLORS[index % CAMPAIGN_COLORS.length] ?? "#6B7280",
    }),
  );

  const projectFunnel = Object.entries(data.projectStatusBreakdown).map(
    ([status, count], index) => ({
      label: formatStatus(status),
      value: count,
      color: PROJECT_COLORS[index % PROJECT_COLORS.length] ?? "#6B7280",
    }),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Campaigns"
          value={data.totalCampaigns}
          subtitle={`${data.activeCampaigns} active`}
          icon={Briefcase}
          trend={data.activeCampaigns > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Total Ideas"
          value={data.totalIdeas}
          icon={Lightbulb}
          trend={data.totalIdeas > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Total Projects"
          value={data.totalProjects}
          icon={FolderKanban}
          trend={data.totalProjects > 0 ? "up" : "neutral"}
        />
        <KpiCard title="Active Users" value={data.totalUsers} icon={Users} trend="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {campaignFunnel.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Campaign Status Breakdown</h3>
            <FunnelChart steps={campaignFunnel} />
          </div>
        )}

        {projectFunnel.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Project Status Breakdown</h3>
            <FunnelChart steps={projectFunnel} />
          </div>
        )}
      </div>

      {data.topCampaigns.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Top Campaigns by Ideas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">Campaign</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Status</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Ideas</th>
                  <th className="pb-3 text-right font-medium text-gray-500">Members</th>
                </tr>
              </thead>
              <tbody>
                {data.topCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{campaign.title}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {formatStatus(campaign.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-600">{campaign.ideaCount}</td>
                    <td className="py-3 text-right text-gray-600">{campaign.memberCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {campaignFunnel.length === 0 &&
        projectFunnel.length === 0 &&
        data.topCampaigns.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">
              No data to display yet. Create campaigns and projects to see analytics here.
            </p>
          </div>
        )}
    </div>
  );
}

const CAMPAIGN_COLORS = ["#6366F1", "#8B5CF6", "#A855F7", "#C084FC", "#D8B4FE", "#E9D5FF"];
const PROJECT_COLORS = ["#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD"];

function formatStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
