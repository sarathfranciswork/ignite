"use client";

import * as React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface CriterionScore {
  criterionId: string;
  criterionTitle: string;
  average: number;
  standardDeviation: number;
}

interface IdeaResult {
  ideaId: string;
  ideaTitle: string;
  weightedScore: number;
  criteriaScores: CriterionScore[];
}

interface Criterion {
  id: string;
  title: string;
  fieldType: string;
  weight: number;
}

interface ResultsBubbleChartProps {
  results: IdeaResult[];
  criteria: Criterion[];
}

type MetricOption = { value: string; label: string };

function getMetricOptions(criteria: Criterion[]): MetricOption[] {
  const options: MetricOption[] = [
    { value: "weightedScore", label: "Weighted Score" },
    { value: "maxStdDev", label: "Max Std. Deviation" },
  ];

  const scoreCriteria = criteria.filter((c) => c.fieldType === "SELECTION_SCALE");
  for (const c of scoreCriteria) {
    options.push({ value: `criterion:${c.id}`, label: c.title });
  }

  return options;
}

function getMetricValue(result: IdeaResult, metric: string): number {
  if (metric === "weightedScore") return result.weightedScore;
  if (metric === "maxStdDev") {
    return Math.max(...result.criteriaScores.map((c) => c.standardDeviation), 0);
  }
  if (metric.startsWith("criterion:")) {
    const criterionId = metric.slice("criterion:".length);
    return result.criteriaScores.find((c) => c.criterionId === criterionId)?.average ?? 0;
  }
  return 0;
}

const BUBBLE_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
];

interface BubbleDataPoint {
  x: number;
  y: number;
  z: number;
  ideaTitle: string;
  ideaId: string;
  fill: string;
}

export function ResultsBubbleChart({ results, criteria }: ResultsBubbleChartProps) {
  const metricOptions = React.useMemo(() => getMetricOptions(criteria), [criteria]);

  const [xMetric, setXMetric] = React.useState("weightedScore");
  const [yMetric, setYMetric] = React.useState(
    metricOptions.length > 2 ? metricOptions[2].value : "maxStdDev",
  );

  const data: BubbleDataPoint[] = React.useMemo(
    () =>
      results.map((r, idx) => ({
        x: getMetricValue(r, xMetric),
        y: getMetricValue(r, yMetric),
        z: r.weightedScore,
        ideaTitle: r.ideaTitle,
        ideaId: r.ideaId,
        fill: BUBBLE_COLORS[idx % BUBBLE_COLORS.length],
      })),
    [results, xMetric, yMetric],
  );

  const xLabel = metricOptions.find((o) => o.value === xMetric)?.label ?? "X";
  const yLabel = metricOptions.find((o) => o.value === yMetric)?.label ?? "Y";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-900">Bubble Chart</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="x-axis-select" className="text-xs text-gray-500">
            X-Axis:
          </label>
          <select
            id="x-axis-select"
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value)}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
          >
            {metricOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="y-axis-select" className="text-xs text-gray-500">
            Y-Axis:
          </label>
          <select
            id="y-axis-select"
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value)}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
          >
            {metricOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-xs text-gray-400">Bubble size = weighted score</div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 11 }}
            label={{ value: xLabel, position: "bottom", offset: 10, fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fontSize: 11 }}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Score" />
          <Tooltip content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />} />
          <Scatter data={data}>
            {data.map((entry) => (
              <circle key={entry.ideaId} fill={entry.fill} fillOpacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-3">
        {results.map((r, idx) => (
          <div key={r.ideaId} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: BUBBLE_COLORS[idx % BUBBLE_COLORS.length] }}
            />
            <span className="text-xs text-gray-600">{r.ideaTitle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BubbleDataPoint }>;
  xLabel: string;
  yLabel: string;
}

function CustomTooltip({ active, payload, xLabel, yLabel }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-sm font-medium text-gray-900">{data.ideaTitle}</p>
      <p className="text-xs text-gray-500">
        {xLabel}: {data.x.toFixed(2)}
      </p>
      <p className="text-xs text-gray-500">
        {yLabel}: {data.y.toFixed(2)}
      </p>
      <p className="text-xs text-gray-500">Weighted Score: {data.z.toFixed(2)}</p>
    </div>
  );
}
