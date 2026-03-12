"use client";

import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { GitBranch, ChevronRight, TrendingUp } from "lucide-react";

interface PipelineViewProps {
  dateFrom?: string;
  dateTo?: string;
}

const stageColors = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
];

export function PipelineView({ dateFrom, dateTo }: PipelineViewProps) {
  const pipelineQuery = trpc.project.pipelineStats.useQuery({
    dateFrom,
    dateTo,
  });

  if (pipelineQuery.isLoading) {
    return (
      <Card className="p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-6 flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 flex-1 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </Card>
    );
  }

  if (pipelineQuery.isError || !pipelineQuery.data) {
    return null;
  }

  const { stages, conversionRates } = pipelineQuery.data;
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-primary-600" />
        <h2 className="font-display text-lg font-semibold text-gray-900">Innovation Pipeline</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        End-to-end flow from idea submission to project completion
      </p>

      <div className="mt-6 flex items-end gap-2">
        {stages.map((stage, i) => {
          const heightPct = Math.max((stage.count / maxCount) * 100, 8);
          const colorClass = stageColors[i] ?? "bg-gray-100 text-gray-800 border-gray-200";

          return (
            <div key={stage.name} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-lg font-bold text-gray-900">{stage.count}</span>
              <div className="w-full overflow-hidden rounded-t-lg">
                <div
                  className={`w-full rounded-t-lg border ${colorClass}`}
                  style={{ height: `${heightPct}px`, minHeight: "8px" }}
                />
              </div>
              <span className="mt-1 text-center text-xs font-medium text-gray-600">
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>

      {conversionRates.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700">Conversion Rates</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {conversionRates.map((rate) => (
              <div
                key={`${rate.from}-${rate.to}`}
                className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm"
              >
                <span className="text-gray-500">{rate.from}</span>
                <ChevronRight className="h-3 w-3 text-gray-300" />
                <span className="text-gray-500">{rate.to}</span>
                <span className="ml-1 font-semibold text-gray-900">{rate.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
