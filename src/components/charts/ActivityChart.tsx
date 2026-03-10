"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ActivityChartProps {
  data: Array<{
    date: string;
    ideasSubmitted: number;
    totalComments: number;
    totalVotes: number;
  }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        No activity data available yet. Data will appear once daily snapshots begin.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} width={40} />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
          }}
        />
        <Area
          type="monotone"
          dataKey="ideasSubmitted"
          name="Ideas"
          stroke="#6366f1"
          fill="#eef2ff"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="totalComments"
          name="Comments"
          stroke="#10b981"
          fill="#ecfdf5"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="totalVotes"
          name="Votes"
          stroke="#f59e0b"
          fill="#fffbeb"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
