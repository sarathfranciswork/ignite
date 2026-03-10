"use client";

import { Users, Lightbulb, MessageSquare, ThumbsUp, Eye, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/charts/KpiCard";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { ActivityChart } from "@/components/charts/ActivityChart";
import { trpc } from "@/lib/trpc";

interface CampaignCockpitProps {
  campaignId: string;
}

export function CampaignCockpit({ campaignId }: CampaignCockpitProps) {
  const kpiQuery = trpc.campaign.getKpis.useQuery({ campaignId });
  const timeSeriesQuery = trpc.campaign.getKpiTimeSeries.useQuery({
    campaignId,
    days: 30,
  });

  if (kpiQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (kpiQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load KPI data. Please try again.</p>
      </div>
    );
  }

  const kpis = kpiQuery.data;
  if (!kpis) return null;

  const funnelSteps = [
    { label: "Submitted", value: kpis.ideasSubmitted, color: "#6366f1" },
    { label: "Qualified", value: kpis.ideasQualified, color: "#8b5cf6" },
    { label: "Hot", value: kpis.ideasHot, color: "#f59e0b" },
    { label: "Evaluated", value: kpis.ideasEvaluated, color: "#10b981" },
    { label: "Selected", value: kpis.ideasSelected, color: "#059669" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Team Members"
          value={kpis.memberCount}
          icon={Users}
          subtitle={`${kpis.participationRate}% participation`}
          trend={kpis.participationRate > 50 ? "up" : "neutral"}
        />
        <KpiCard
          title="Ideas Submitted"
          value={kpis.ideasSubmitted}
          icon={Lightbulb}
          subtitle={kpis.ideasSubmitted === 0 ? "No ideas yet" : undefined}
          trend={kpis.ideasSubmitted > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Comments"
          value={kpis.totalComments}
          icon={MessageSquare}
          trend={kpis.totalComments > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Votes"
          value={kpis.totalVotes}
          icon={ThumbsUp}
          trend={kpis.totalVotes > 0 ? "up" : "neutral"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <h3 className="font-display text-sm font-semibold text-gray-900">Activity Over Time</h3>
          </div>
          <ActivityChart data={timeSeriesQuery.data ?? []} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-500" />
            <h3 className="font-display text-sm font-semibold text-gray-900">Idea Funnel</h3>
          </div>
          {kpis.ideasSubmitted === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">
              No ideas submitted yet. The funnel will populate as ideas progress.
            </div>
          ) : (
            <FunnelChart steps={funnelSteps} />
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          title="Awareness Rate"
          value={`${kpis.awarenessRate}%`}
          icon={Eye}
          trend={kpis.awarenessRate > 50 ? "up" : "neutral"}
        />
        <KpiCard
          title="Total Likes"
          value={kpis.totalLikes}
          icon={ThumbsUp}
          trend={kpis.totalLikes > 0 ? "up" : "neutral"}
        />
        <KpiCard
          title="Ideas Selected"
          value={kpis.ideasSelected}
          icon={Lightbulb}
          subtitle={
            kpis.ideasSubmitted > 0
              ? `${Math.round((kpis.ideasSelected / kpis.ideasSubmitted) * 100)}% selection rate`
              : undefined
          }
          trend={kpis.ideasSelected > 0 ? "up" : "neutral"}
        />
      </div>
    </div>
  );
}
