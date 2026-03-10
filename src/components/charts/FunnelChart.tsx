"use client";

import { cn } from "@/lib/utils";

interface FunnelStep {
  stage: string;
  count: number;
}

interface FunnelChartProps {
  data: FunnelStep[];
  className?: string;
}

const FUNNEL_COLORS = [
  "bg-primary-600",
  "bg-primary-500",
  "bg-primary-400",
  "bg-amber-500",
  "bg-green-500",
];

export function FunnelChart({ data, className }: FunnelChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((step, index) => {
        const widthPercent = Math.max((step.count / maxCount) * 100, 8);

        return (
          <div key={step.stage} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{step.stage}</span>
              <span className="tabular-nums text-gray-500">{step.count.toLocaleString()}</span>
            </div>
            <div className="h-8 w-full rounded-md bg-gray-100">
              <div
                className={cn(
                  "flex h-full items-center rounded-md px-3 transition-all duration-500",
                  FUNNEL_COLORS[index % FUNNEL_COLORS.length],
                )}
                style={{ width: `${widthPercent}%` }}
              >
                {step.count > 0 && (
                  <span className="text-xs font-semibold text-white">
                    {step.count.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
