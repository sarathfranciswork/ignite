"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

type AxisField = "progressPercent" | "durationDays" | "teamSize" | "gatePassRate";

interface PortfolioMatrixChartProps {
  processDefinitionId?: string;
  status?: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "TERMINATED";
}

const AXIS_OPTIONS: { value: AxisField; label: string }[] = [
  { value: "progressPercent", label: "Progress %" },
  { value: "durationDays", label: "Duration (days)" },
  { value: "teamSize", label: "Team Size" },
  { value: "gatePassRate", label: "Gate Pass Rate" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#3B82F6",
  ON_HOLD: "#F59E0B",
  COMPLETED: "#10B981",
  TERMINATED: "#EF4444",
};

export function PortfolioMatrixChart({ processDefinitionId, status }: PortfolioMatrixChartProps) {
  const [xAxis, setXAxis] = useState<AxisField>("progressPercent");
  const [yAxis, setYAxis] = useState<AxisField>("durationDays");

  const matrixQuery = trpc.portfolioAnalyzer.matrix.useQuery({
    processDefinitionId,
    status,
  });

  if (matrixQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />;
  }

  if (matrixQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load project matrix.</p>
      </div>
    );
  }

  const projects = matrixQuery.data ?? [];

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-sm text-gray-500">No projects match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">X Axis</label>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value as AxisField)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {AXIS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Y Axis</label>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value as AxisField)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {AXIS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {Object.entries(STATUS_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-gray-500">{key.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      <BubbleChart projects={projects} xAxis={xAxis} yAxis={yAxis} />
    </div>
  );
}

interface MatrixProject {
  id: string;
  title: string;
  status: string;
  processDefinitionName: string;
  teamSize: number;
  phaseCount: number;
  completedPhases: number;
  progressPercent: number;
  durationDays: number;
  gatePassCount: number;
  gateTotalCount: number;
}

function getFieldValue(project: MatrixProject, field: AxisField): number {
  switch (field) {
    case "progressPercent":
      return project.progressPercent;
    case "durationDays":
      return project.durationDays;
    case "teamSize":
      return project.teamSize;
    case "gatePassRate":
      return project.gateTotalCount > 0
        ? Math.round((project.gatePassCount / project.gateTotalCount) * 100)
        : 0;
  }
}

function BubbleChart({
  projects,
  xAxis,
  yAxis,
}: {
  projects: MatrixProject[];
  xAxis: AxisField;
  yAxis: AxisField;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const CHART_WIDTH = 800;
  const CHART_HEIGHT = 400;
  const PADDING = 50;

  const xValues = projects.map((p) => getFieldValue(p, xAxis));
  const yValues = projects.map((p) => getFieldValue(p, yAxis));

  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 1);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 1);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const scaleX = (val: number) => PADDING + ((val - xMin) / xRange) * (CHART_WIDTH - 2 * PADDING);
  const scaleY = (val: number) =>
    CHART_HEIGHT - PADDING - ((val - yMin) / yRange) * (CHART_HEIGHT - 2 * PADDING);

  const xLabel = AXIS_OPTIONS.find((o) => o.value === xAxis)?.label ?? xAxis;
  const yLabel = AXIS_OPTIONS.find((o) => o.value === yAxis)?.label ?? yAxis;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1={PADDING}
          y1={CHART_HEIGHT - PADDING}
          x2={CHART_WIDTH - PADDING}
          y2={CHART_HEIGHT - PADDING}
          stroke="#E5E7EB"
          strokeWidth={1}
        />
        <line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={CHART_HEIGHT - PADDING}
          stroke="#E5E7EB"
          strokeWidth={1}
        />

        <text
          x={CHART_WIDTH / 2}
          y={CHART_HEIGHT - 10}
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
        >
          {xLabel}
        </text>
        <text
          x={15}
          y={CHART_HEIGHT / 2}
          textAnchor="middle"
          className="fill-gray-500 text-[11px]"
          transform={`rotate(-90, 15, ${CHART_HEIGHT / 2})`}
        >
          {yLabel}
        </text>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const xVal = xMin + frac * xRange;
          const yVal = yMin + frac * yRange;
          const px = scaleX(xVal);
          const py = scaleY(yVal);
          return (
            <g key={frac}>
              <text
                x={px}
                y={CHART_HEIGHT - PADDING + 16}
                textAnchor="middle"
                className="fill-gray-400 text-[9px]"
              >
                {Math.round(xVal)}
              </text>
              <line
                x1={px}
                y1={CHART_HEIGHT - PADDING}
                x2={px}
                y2={CHART_HEIGHT - PADDING + 4}
                stroke="#9CA3AF"
                strokeWidth={1}
              />
              <text
                x={PADDING - 8}
                y={py + 3}
                textAnchor="end"
                className="fill-gray-400 text-[9px]"
              >
                {Math.round(yVal)}
              </text>
              <line
                x1={PADDING - 4}
                y1={py}
                x2={PADDING}
                y2={py}
                stroke="#9CA3AF"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {projects.map((project) => {
          const cx = scaleX(getFieldValue(project, xAxis));
          const cy = scaleY(getFieldValue(project, yAxis));
          const r = Math.max(8, Math.min(20, project.teamSize * 3 + 5));
          const color = STATUS_COLORS[project.status] ?? "#6B7280";
          const isHovered = hoveredId === project.id;

          return (
            <g key={project.id}>
              <Link href={`/projects/${project.id}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? r + 2 : r}
                  fill={color}
                  fillOpacity={isHovered ? 0.9 : 0.65}
                  stroke={isHovered ? "#1F2937" : color}
                  strokeWidth={isHovered ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                />
              </Link>
              {isHovered && (
                <g>
                  <rect
                    x={cx + r + 6}
                    y={cy - 28}
                    width={Math.max(project.title.length * 6.5, 120)}
                    height={48}
                    rx={6}
                    fill="white"
                    stroke="#E5E7EB"
                    strokeWidth={1}
                  />
                  <text
                    x={cx + r + 12}
                    y={cy - 10}
                    className="fill-gray-900 text-[11px] font-semibold"
                  >
                    {project.title}
                  </text>
                  <text x={cx + r + 12} y={cy + 8} className="fill-gray-500 text-[9px]">
                    {project.processDefinitionName} - {project.status.replace("_", " ")}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
