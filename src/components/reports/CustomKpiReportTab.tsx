"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { downloadExcel } from "@/lib/download-excel";
import { Button } from "@/components/ui/button";
import { Download, Loader2, BarChart3, Filter } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MetricKey =
  | "ideas_submitted"
  | "ideas_qualified"
  | "ideas_hot"
  | "total_comments"
  | "total_votes"
  | "total_likes"
  | "unique_visitors"
  | "total_participants"
  | "member_count";

type GroupByKey = "campaign" | "date" | "org_unit";

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: "ideas_submitted", label: "Ideas Submitted" },
  { key: "ideas_qualified", label: "Ideas Qualified" },
  { key: "ideas_hot", label: "Ideas HOT!" },
  { key: "total_comments", label: "Total Comments" },
  { key: "total_votes", label: "Total Votes" },
  { key: "total_likes", label: "Total Likes" },
  { key: "unique_visitors", label: "Unique Visitors" },
  { key: "total_participants", label: "Total Participants" },
  { key: "member_count", label: "Member Count" },
];

const GROUP_BY_OPTIONS: Array<{ key: GroupByKey; label: string }> = [
  { key: "campaign", label: "By Campaign" },
  { key: "date", label: "By Date" },
  { key: "org_unit", label: "By Org Unit" },
];

export function CustomKpiReportTab() {
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    "ideas_submitted",
    "total_comments",
    "total_votes",
  ]);
  const [groupBy, setGroupBy] = useState<GroupByKey>("campaign");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showReport, setShowReport] = useState(false);

  const campaignsQuery = trpc.campaign.list.useQuery({ limit: 50 }, { staleTime: 60_000 });

  const reportInput = {
    campaignIds: selectedCampaignIds,
    metrics: selectedMetrics,
    groupBy,
    format: "json" as const,
    ...(dateFrom && dateTo
      ? {
          dateRange: {
            from: new Date(dateFrom).toISOString(),
            to: new Date(dateTo).toISOString(),
          },
        }
      : {}),
  };

  const reportQuery = trpc.export.customKpiReport.useQuery(reportInput, {
    enabled: showReport && selectedCampaignIds.length > 0 && selectedMetrics.length > 0,
  });

  const excelExport = trpc.export.customKpiReportExcel.useMutation({
    onSuccess(data) {
      downloadExcel(data.data, data.filename);
      toast.success("Custom KPI report exported to Excel");
    },
    onError(error) {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  function toggleCampaign(campaignId: string) {
    setShowReport(false);
    setSelectedCampaignIds((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : prev.length < 20
          ? [...prev, campaignId]
          : prev,
    );
  }

  function toggleMetric(metric: MetricKey) {
    setShowReport(false);
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric],
    );
  }

  function handleGenerateReport() {
    if (selectedCampaignIds.length === 0) {
      toast.error("Select at least one campaign");
      return;
    }
    if (selectedMetrics.length === 0) {
      toast.error("Select at least one metric");
      return;
    }
    setShowReport(true);
  }

  function handleExportExcel() {
    if (selectedCampaignIds.length === 0 || selectedMetrics.length === 0) return;
    excelExport.mutate({
      ...reportInput,
      format: "excel",
    });
  }

  const campaigns = campaignsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Report Configuration</h3>
        </div>

        {/* Campaign Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Campaigns ({selectedCampaignIds.length} selected, max 20)
          </label>
          {campaignsQuery.isLoading ? (
            <div className="h-20 animate-pulse rounded-lg bg-gray-50" />
          ) : (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => toggleCampaign(campaign.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    selectedCampaignIds.includes(campaign.id)
                      ? "bg-primary-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100",
                  )}
                >
                  {campaign.title}
                </button>
              ))}
              {campaigns.length === 0 && (
                <p className="text-xs text-gray-400">No campaigns available</p>
              )}
            </div>
          )}
        </div>

        {/* Metrics Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">KPI Metrics</label>
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((metric) => (
              <button
                key={metric.key}
                onClick={() => toggleMetric(metric.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  selectedMetrics.includes(metric.key)
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>

        {/* Group By & Date Range */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Group By</label>
            <div className="flex gap-1">
              {GROUP_BY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setGroupBy(opt.key);
                    setShowReport(false);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    groupBy === opt.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="date-from" className="mb-2 block text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setShowReport(false);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="date-to" className="mb-2 block text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setShowReport(false);
              }}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <Button onClick={handleGenerateReport} disabled={selectedCampaignIds.length === 0}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={
              selectedCampaignIds.length === 0 ||
              selectedMetrics.length === 0 ||
              excelExport.isPending
            }
          >
            {excelExport.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Report Results */}
      {showReport && reportQuery.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50" />
          ))}
        </div>
      )}

      {showReport && reportQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to generate report. Please try again.</p>
        </div>
      )}

      {showReport && reportQuery.data && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Custom KPI Report ({reportQuery.data.rows.length} rows)
            </h3>
            <span className="text-xs text-gray-400">
              Generated: {new Date(reportQuery.data.generatedAt).toLocaleString()}
            </span>
          </div>

          {reportQuery.data.rows.length === 0 ? (
            <div className="py-8 text-center">
              <BarChart3 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No KPI data found for the selected filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-left font-medium text-gray-500">Campaign</th>
                    <th className="pb-3 text-left font-medium text-gray-500">Date</th>
                    {reportQuery.data.rows[0]?.orgUnitName && (
                      <th className="pb-3 text-left font-medium text-gray-500">Org Unit</th>
                    )}
                    {reportQuery.data.metricNames.map((name) => (
                      <th key={name} className="pb-3 text-right font-medium text-gray-500">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportQuery.data.rows.map((row, idx) => (
                    <tr
                      key={`${row.campaignId}-${row.date}-${idx}`}
                      className="border-b border-gray-50"
                    >
                      <td className="py-3 font-medium text-gray-900">{row.campaignTitle}</td>
                      <td className="py-3 text-gray-600">{row.date}</td>
                      {row.orgUnitName && <td className="py-3 text-gray-600">{row.orgUnitName}</td>}
                      {reportQuery.data.metricNames.map((name) => (
                        <td key={name} className="py-3 text-right text-gray-600">
                          {(row.metrics[name] ?? 0).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
