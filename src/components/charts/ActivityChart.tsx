"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface ActivityDataPoint {
  date: string;
  ideas: number;
  comments: number;
  votes: number;
}

interface ActivityChartProps {
  data: ActivityDataPoint[];
  className?: string;
}

export function ActivityChart({ data, className }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn("flex h-64 items-center justify-center text-sm text-gray-400", className)}>
        No activity data available yet.
      </div>
    );
  }

  return (
    <div className={cn("h-72", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickFormatter={(value: string) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            labelFormatter={(label) => {
              const date = new Date(String(label));
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" iconSize={8} />
          <Area
            type="monotone"
            dataKey="ideas"
            name="Ideas"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="comments"
            name="Comments"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.1}
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="votes"
            name="Votes"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.1}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
