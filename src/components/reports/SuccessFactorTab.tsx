"use client";

import { trpc } from "@/lib/trpc";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";

const FACTOR_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

const FACTOR_LABELS: Record<string, string> = {
  duration_vs_participation: "Duration vs. Participation",
  voting_criteria_vs_eval_quality: "Voting Criteria vs. Eval Quality",
  audience_size_vs_participation: "Audience Size vs. Participation",
  graduation_threshold_vs_hot_rate: "Graduation Threshold vs. HOT! Rate",
  coach_vs_participation: "Coach Enabled vs. Participation",
};

export function SuccessFactorTab() {
  const query = trpc.campaignComparison.successFactors.useQuery({}, { staleTime: 60_000 });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-12 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing success factors...
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {query.error.message}
      </div>
    );
  }

  const data = query.data;
  if (!data) return null;

  const { correlations, recommendations, campaignCount } = data;

  if (campaignCount === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No campaigns available for analysis. Launch some campaigns to see success factor insights.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          Analyzing <span className="font-semibold text-gray-900">{campaignCount}</span> campaigns
          to identify factors correlated with success.
        </p>
      </div>

      {/* Correlation Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {correlations.map((corr, idx) => (
          <div key={corr.factor} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                {FACTOR_LABELS[corr.factor] ?? corr.factor}
              </h4>
              <CorrelationBadge strength={corr.correlationStrength} direction={corr.direction} />
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    name={corr.xLabel}
                    type="number"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: corr.xLabel,
                      position: "insideBottom",
                      offset: -10,
                      style: { fontSize: 10, fill: "#6b7280" },
                    }}
                  />
                  <YAxis
                    dataKey="y"
                    name={corr.yLabel}
                    type="number"
                    tick={{ fontSize: 10 }}
                    label={{
                      value: corr.yLabel,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 10, fill: "#6b7280" },
                    }}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const data = payload[0]?.payload as
                        | {
                            title: string;
                            x: number;
                            y: number;
                          }
                        | undefined;
                      if (!data) return null;
                      return (
                        <div className="rounded border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold text-gray-900">{data.title}</p>
                          <p className="text-gray-600">
                            {corr.xLabel}: {data.x}
                          </p>
                          <p className="text-gray-600">
                            {corr.yLabel}: {data.y}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={corr.dataPoints}>
                    {corr.dataPoints.map((_, i) => (
                      <Cell
                        key={i}
                        fill={FACTOR_COLORS[idx % FACTOR_COLORS.length]}
                        fillOpacity={0.7}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Actionable Insights</h3>
          </div>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.factor} className="rounded-md border border-gray-100 bg-gray-50 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-800">{rec.factor}</h4>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {rec.recommendedRange}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{rec.insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CorrelationBadge({
  strength,
  direction,
}: {
  strength: number;
  direction: "positive" | "negative" | "none";
}) {
  const Icon =
    direction === "positive" ? TrendingUp : direction === "negative" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        direction === "positive" && "bg-green-100 text-green-700",
        direction === "negative" && "bg-red-100 text-red-700",
        direction === "none" && "bg-gray-100 text-gray-600",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.round(strength * 100)}%
    </div>
  );
}
