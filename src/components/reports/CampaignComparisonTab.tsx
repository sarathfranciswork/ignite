"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Check, Loader2, AlertTriangle } from "lucide-react";

const COMPARISON_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

interface CampaignMetrics {
  campaignId: string;
  title: string;
  status: string;
  memberCount: number;
  ideaCount: number;
  durationDays: number | null;
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalVotes: number;
    totalViews: number;
    uniqueVisitors: number;
  };
  ideaStatusBreakdown: Record<string, number>;
  configuration: {
    hasSeedingPhase: boolean;
    hasDiscussionPhase: boolean;
    hasCommunityGraduation: boolean;
    hasQualificationPhase: boolean;
    hasVoting: boolean;
    hasLikes: boolean;
    hasIdeaCoach: boolean;
  };
}

function getMetricValue(campaign: CampaignMetrics, key: string): string | number | null {
  switch (key) {
    case "status":
      return campaign.status;
    case "memberCount":
      return campaign.memberCount;
    case "ideaCount":
      return campaign.ideaCount;
    case "participationRate":
      return campaign.memberCount > 0
        ? Math.round((campaign.ideaCount / campaign.memberCount) * 100) / 100
        : 0;
    case "totalLikes":
      return campaign.engagement.totalLikes;
    case "totalComments":
      return campaign.engagement.totalComments;
    case "totalVotes":
      return campaign.engagement.totalVotes;
    case "hotCount":
      return campaign.ideaStatusBreakdown["HOT"] ?? 0;
    case "durationDays":
      return campaign.durationDays;
    case "coachEnabled":
      return campaign.configuration.hasIdeaCoach ? "Yes" : "No";
    default:
      return null;
  }
}

export function CampaignComparisonTab() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const campaignsQuery = trpc.campaign.list.useQuery({ limit: 50 }, { staleTime: 60_000 });

  const comparisonQuery = trpc.campaignComparison.compare.useQuery(
    { campaignIds: selectedIds },
    { enabled: selectedIds.length >= 2 },
  );

  const campaigns = campaignsQuery.data?.items ?? [];

  function toggleCampaign(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  const data = comparisonQuery.data;

  // Build radar data from comparison results
  const radarData = data ? buildRadarData(data.campaigns) : [];

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Select 2-4 Campaigns to Compare
        </h3>
        {campaignsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading campaigns...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {campaigns.map((campaign) => {
              const isSelected = selectedIds.includes(campaign.id);
              const isDisabled = !isSelected && selectedIds.length >= 4;
              return (
                <button
                  key={campaign.id}
                  onClick={() => toggleCampaign(campaign.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : isDisabled
                        ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                        : "border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {campaign.title}
                  <span className="text-xs text-gray-400">({campaign.status})</span>
                </button>
              );
            })}
          </div>
        )}
        {selectedIds.length > 0 && selectedIds.length < 2 && (
          <p className="mt-2 text-xs text-amber-600">
            Select at least one more campaign to compare.
          </p>
        )}
      </div>

      {/* Results */}
      {comparisonQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-12 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comparing campaigns...
        </div>
      )}

      {comparisonQuery.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {comparisonQuery.error.message}
        </div>
      )}

      {data && (
        <>
          {/* KPI Comparison Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <div className="flex items-center gap-1">
                      <ArrowUpDown className="h-3 w-3" />
                      Metric
                    </div>
                  </th>
                  {data.campaigns.map((c, i) => (
                    <th key={c.campaignId} className="px-4 py-3 text-right font-semibold">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COMPARISON_COLORS[i] }}
                        />
                        <span className="max-w-[120px] truncate text-gray-700">{c.title}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRIC_ROWS.map((row) => {
                  const values = data.campaigns.map((c) => Number(getMetricValue(c, row.key) ?? 0));
                  const isSignificant = row.format !== "text" && isSpreadSignificant(values);

                  return (
                    <tr
                      key={row.key}
                      className={cn("border-b border-gray-100", isSignificant && "bg-amber-50")}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-700">
                        <div className="flex items-center gap-1.5">
                          {row.label}
                          {isSignificant && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        </div>
                      </td>
                      {data.campaigns.map((c) => {
                        const value = getMetricValue(c, row.key);
                        return (
                          <td key={c.campaignId} className="px-4 py-2.5 text-right text-gray-600">
                            {formatMetric(value, row.format)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Radar Chart */}
          {radarData.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Performance Radar</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {data.campaigns.map((c, i) => (
                      <Radar
                        key={c.campaignId}
                        name={c.title}
                        dataKey={c.title}
                        stroke={COMPARISON_COLORS[i]}
                        fill={COMPARISON_COLORS[i]}
                        fillOpacity={0.15}
                      />
                    ))}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const METRIC_ROWS = [
  { label: "Status", key: "status", format: "text" },
  { label: "Members", key: "memberCount", format: "number" },
  { label: "Ideas", key: "ideaCount", format: "number" },
  { label: "Participation Rate", key: "participationRate", format: "decimal" },
  { label: "HOT! Ideas", key: "hotCount", format: "number" },
  { label: "Total Likes", key: "totalLikes", format: "number" },
  { label: "Total Comments", key: "totalComments", format: "number" },
  { label: "Total Votes", key: "totalVotes", format: "number" },
  { label: "Duration (days)", key: "durationDays", format: "number" },
  { label: "Idea Coach", key: "coachEnabled", format: "text" },
];

function formatMetric(value: string | number | null, format: string): string {
  if (value === null || value === undefined) return "-";
  if (format === "text") return String(value);
  if (format === "decimal") return Number(value).toFixed(2);
  return String(value);
}

function isSpreadSignificant(values: number[]): boolean {
  if (values.length < 2) return false;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return false;
  return (max - min) / avg > 0.5;
}

function normalizeToPercent(value: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((value / max) * 100);
}

function buildRadarData(campaigns: CampaignMetrics[]): Array<Record<string, string | number>> {
  const radarKeys = [
    {
      label: "Participation",
      getValue: (c: CampaignMetrics) => (c.memberCount > 0 ? c.ideaCount / c.memberCount : 0),
    },
    {
      label: "HOT! Rate",
      getValue: (c: CampaignMetrics) => {
        const hot = c.ideaStatusBreakdown["HOT"] ?? 0;
        return c.ideaCount > 0 ? hot / c.ideaCount : 0;
      },
    },
    {
      label: "Engagement",
      getValue: (c: CampaignMetrics) =>
        c.engagement.totalLikes + c.engagement.totalComments + c.engagement.totalVotes,
    },
    {
      label: "Ideas",
      getValue: (c: CampaignMetrics) => c.ideaCount,
    },
    {
      label: "Comments",
      getValue: (c: CampaignMetrics) => c.engagement.totalComments,
    },
    {
      label: "Votes",
      getValue: (c: CampaignMetrics) => c.engagement.totalVotes,
    },
  ];

  return radarKeys.map(({ label, getValue }) => {
    const rawValues = campaigns.map(getValue);
    const max = Math.max(...rawValues, 1);
    const point: Record<string, string | number> = { metric: label };
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i];
      if (campaign) {
        point[campaign.title] = normalizeToPercent(rawValues[i] ?? 0, max);
      }
    }
    return point;
  });
}
