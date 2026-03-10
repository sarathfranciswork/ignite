"use client";

import {
  Users,
  Eye,
  UserCheck,
  Lightbulb,
  MessageSquare,
  ThumbsUp,
  Heart,
  TrendingUp,
  Download,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/charts/KpiCard";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ActivityChart } from "@/components/charts/ActivityChart";

interface CampaignCockpitProps {
  campaignId: string;
}

export function CampaignCockpit({ campaignId }: CampaignCockpitProps) {
  const cockpitQuery = trpc.campaign.getCockpit.useQuery({ campaignId });
  const activityQuery = trpc.campaign.getCockpitActivity.useQuery({
    campaignId,
    days: 30,
  });

  const handleExport = () => {
    void exportToCSV(campaignId);
  };

  if (cockpitQuery.isLoading) {
    return <CockpitSkeleton />;
  }

  if (cockpitQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load cockpit data. Please try again.</p>
      </div>
    );
  }

  if (!cockpitQuery.data) return null;

  const { kpis, funnel } = cockpitQuery.data;

  return (
    <div className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-gray-900">Campaign Cockpit</h2>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export Data
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Awareness Rate"
          value={`${kpis.awarenessRate}%`}
          subtitle={`${kpis.browsedCount} browsed / ${kpis.invitedCount} invited`}
          icon={Eye}
          trend={kpis.awarenessRate > 50 ? "up" : "neutral"}
        />
        <KpiCard
          title="Participation Rate"
          value={`${kpis.participationRate}%`}
          subtitle={`${kpis.participantCount} participants`}
          icon={UserCheck}
          trend={kpis.participationRate > 20 ? "up" : "neutral"}
        />
        <KpiCard title="Ideas" value={kpis.ideaCount} icon={Lightbulb} />
        <KpiCard title="Comments" value={kpis.commentCount} icon={MessageSquare} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Votes" value={kpis.voteCount} icon={ThumbsUp} />
        <KpiCard title="Likes" value={kpis.likeCount} icon={Heart} />
        <KpiCard title="Invited" value={kpis.invitedCount} icon={Users} />
        <KpiCard title="Browsed" value={kpis.browsedCount} icon={TrendingUp} />
      </div>

      {/* Activity Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-display text-sm font-semibold text-gray-900">
          Activity Over Time
        </h3>
        {activityQuery.isLoading ? (
          <div className="h-72 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <ActivityChart data={activityQuery.data ?? []} />
        )}
      </div>

      {/* Idea Funnel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-display text-sm font-semibold text-gray-900">Idea Funnel</h3>
        <FunnelChart data={funnel} />
      </div>
    </div>
  );
}

function CockpitSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
    </div>
  );
}

async function exportToCSV(campaignId: string) {
  // Use fetch to call the tRPC endpoint directly for download
  // This avoids adding the full tRPC client mutation overhead
  try {
    const response = await fetch(
      `/api/trpc/campaign.exportCockpit?input=${encodeURIComponent(JSON.stringify({ campaignId }))}`,
    );

    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as { result: { data: ExportRow[] } };
    const rows = result.result.data;

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => String(row[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campaign-${campaignId}-kpis.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    // Export failed silently — no user-facing error for CSV download
  }
}

interface ExportRow {
  date: string;
  invitedCount: number;
  browsedCount: number;
  participantCount: number;
  ideaCount: number;
  commentCount: number;
  voteCount: number;
  likeCount: number;
  submittedCount: number;
  qualifiedCount: number;
  hotCount: number;
  evaluatedCount: number;
  selectedCount: number;
}
