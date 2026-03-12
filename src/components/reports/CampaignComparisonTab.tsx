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

      {comparisonQuery.data && (
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
                  {comparisonQuery.data.campaigns.map((c, i) => (
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
                {[
                  { label: "Status", key: "status" as const, format: "text" },
                  { label: "Members", key: "memberCount" as const, format: "number" },
                  { label: "Ideas", key: "ideaCount" as const, format: "number" },
                  {
                    label: "Participation Rate",
                    key: "participationRate" as const,
                    format: "rate",
                  },
                  { label: "Average Votes", key: "averageVotes" as const, format: "decimal" },
                  {
                    label: "HOT! Graduation Rate",
                    key: "hotGraduationRate" as const,
                    format: "percent",
                  },
                  {
                    label: "Eval Completion Rate",
                    key: "evaluationCompletionRate" as const,
                    format: "percent",
                  },
                  { label: "Shortlisted", key: "shortlistCount" as const, format: "number" },
                  { label: "Total Likes", key: "totalLikes" as const, format: "number" },
                  { label: "Total Comments", key: "totalComments" as const, format: "number" },
                  { label: "Total Votes", key: "totalVotes" as const, format: "number" },
                  { label: "Duration (days)", key: "duration" as const, format: "number" },
                ].map((row) => {
                  const highlight = comparisonQuery.data.highlights.find(
                    (h) => h.metric === row.label,
                  );
                  const isSignificant = highlight?.isSignificant ?? false;

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
                      {comparisonQuery.data.campaigns.map((c) => {
                        const value = c[row.key];
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
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Performance Radar</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={comparisonQuery.data.radarMetrics.map((rm) => {
                    const point: Record<string, string | number> = {
                      metric: rm.metric,
                    };
                    for (const v of rm.values) {
                      const campaign = comparisonQuery.data.campaigns.find(
                        (c) => c.campaignId === v.campaignId,
                      );
                      if (campaign) {
                        point[campaign.title] = v.value;
                      }
                    }
                    return point;
                  })}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {comparisonQuery.data.campaigns.map((c, i) => (
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
        </>
      )}
    </div>
  );
}

function formatMetric(value: string | number | boolean | null, format: string): string {
  if (value === null || value === undefined) return "-";
  if (format === "text") return String(value);
  if (format === "percent") return `${Math.round(Number(value) * 100)}%`;
  if (format === "rate") return String(value);
  if (format === "decimal") return Number(value).toFixed(1);
  return String(value);
}
