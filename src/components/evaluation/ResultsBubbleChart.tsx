"use client";

import * as React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CriteriaScore {
  criterionId: string;
  criterionTitle: string;
  average: number;
  normalizedAverage: number;
  standardDeviation: number;
  isControversial: boolean;
}

interface IdeaResult {
  ideaId: string;
  ideaTitle: string;
  weightedScore: number;
  normalizedScore: number;
  isShortlisted: boolean;
  isControversial: boolean;
  criteriaScores: CriteriaScore[];
}

interface CriterionInfo {
  id: string;
  title: string;
  fieldType: string;
}

interface ResultsBubbleChartProps {
  results: IdeaResult[];
  criteria: CriterionInfo[];
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

interface BubbleDataPoint {
  x: number;
  y: number;
  z: number;
  name: string;
  ideaId: string;
  isShortlisted: boolean;
  isControversial: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: BubbleDataPoint;
  }>;
  xLabel: string;
  yLabel: string;
}

function CustomTooltip({ active, payload, xLabel, yLabel }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="mb-1 font-medium text-gray-900">{data.name}</p>
      <p className="text-sm text-gray-600">
        {xLabel}: {data.x.toFixed(2)}
      </p>
      <p className="text-sm text-gray-600">
        {yLabel}: {data.y.toFixed(2)}
      </p>
      <p className="text-sm text-gray-600">Score: {data.z.toFixed(2)}</p>
      {data.isShortlisted && (
        <p className="mt-1 text-xs font-medium text-yellow-600">Shortlisted</p>
      )}
      {data.isControversial && (
        <p className="text-xs font-medium text-amber-600">Controversial ratings</p>
      )}
    </div>
  );
}

export function ResultsBubbleChart({ results, criteria }: ResultsBubbleChartProps) {
  const scoreCriteria = criteria.filter((c) => c.fieldType === "SELECTION_SCALE");

  const [xCriterionId, setXCriterionId] = React.useState<string>(scoreCriteria[0]?.id ?? "");
  const [yCriterionId, setYCriterionId] = React.useState<string>(
    scoreCriteria[1]?.id ?? scoreCriteria[0]?.id ?? "",
  );

  if (scoreCriteria.length < 2) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Bubble chart requires at least two scoring criteria. This session has {scoreCriteria.length}
        .
      </div>
    );
  }

  const xLabel = scoreCriteria.find((c) => c.id === xCriterionId)?.title ?? "X Axis";
  const yLabel = scoreCriteria.find((c) => c.id === yCriterionId)?.title ?? "Y Axis";

  const data: BubbleDataPoint[] = results.map((r) => {
    const xScore = r.criteriaScores.find((cs) => cs.criterionId === xCriterionId);
    const yScore = r.criteriaScores.find((cs) => cs.criterionId === yCriterionId);

    return {
      x: xScore?.average ?? 0,
      y: yScore?.average ?? 0,
      z: r.weightedScore,
      name: r.ideaTitle,
      ideaId: r.ideaId,
      isShortlisted: r.isShortlisted,
      isControversial: r.isControversial,
    };
  });

  const maxScore = Math.max(...results.map((r) => r.weightedScore), 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="x-axis-select" className="text-sm font-medium text-gray-600">
            X Axis:
          </label>
          <select
            id="x-axis-select"
            value={xCriterionId}
            onChange={(e) => setXCriterionId(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {scoreCriteria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="y-axis-select" className="text-sm font-medium text-gray-600">
            Y Axis:
          </label>
          <select
            id="y-axis-select"
            value={yCriterionId}
            onChange={(e) => setYCriterionId(e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            {scoreCriteria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            label={{ value: xLabel, position: "bottom", offset: 20, style: { fill: "#6b7280" } }}
            stroke="#9ca3af"
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            label={{
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: -20,
              style: { fill: "#6b7280" },
            }}
            stroke="#9ca3af"
          />
          <ZAxis type="number" dataKey="z" range={[100, 800]} domain={[0, maxScore]} name="Score" />
          <Tooltip
            content={<CustomTooltip xLabel={xLabel} yLabel={yLabel} />}
            cursor={{ strokeDasharray: "3 3" }}
          />
          <Scatter data={data}>
            {data.map((entry, index) => (
              <Cell
                key={entry.ideaId}
                fill={entry.isShortlisted ? "#eab308" : COLORS[index % COLORS.length]}
                fillOpacity={entry.isControversial ? 0.6 : 0.8}
                stroke={entry.isShortlisted ? "#ca8a04" : COLORS[index % COLORS.length]}
                strokeWidth={entry.isShortlisted ? 2 : 1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
        <span>Bubble size = weighted score</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" /> Shortlisted
        </span>
      </div>
    </div>
  );
}
