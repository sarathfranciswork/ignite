"use client";

import { trpc } from "@/lib/trpc";

const FUNNEL_COLORS = [
  "bg-gray-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-amber-400",
  "bg-emerald-400",
];

export function UseCaseFunnelView() {
  const funnelQuery = trpc.useCase.funnel.useQuery({});

  if (funnelQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    );
  }

  const stages = funnelQuery.data ?? [];
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => {
        const widthPercent = Math.max((stage.count / maxCount) * 100, 8);
        return (
          <div key={stage.status} className="flex items-center gap-3">
            <span className="w-28 text-right text-sm font-medium text-gray-600">{stage.label}</span>
            <div className="flex-1">
              <div
                className={`${FUNNEL_COLORS[index]} flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-white transition-all`}
                style={{ width: `${widthPercent}%` }}
              >
                {stage.count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
