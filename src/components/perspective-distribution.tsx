"use client";

import { PERSPECTIVES } from "./perspective-selector";

interface DistributionItem {
  perspective: string;
  count: number;
}

interface PerspectiveDistributionProps {
  distribution: DistributionItem[];
  totalComments: number;
  withPerspective: number;
}

export function PerspectiveDistribution({
  distribution,
  totalComments,
  withPerspective,
}: PerspectiveDistributionProps) {
  if (totalComments === 0) {
    return null;
  }

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Thinking Hats
        </h4>
        <span className="text-xs text-gray-400">
          {withPerspective}/{totalComments} tagged
        </span>
      </div>

      <div className="space-y-1.5">
        {PERSPECTIVES.map((p) => {
          const item = distribution.find((d) => d.perspective === p.value);
          const count = item?.count ?? 0;
          const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={p.value} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
                title={p.label}
              />
              <div className="flex-1">
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: p.color,
                      minWidth: count > 0 ? "4px" : "0",
                    }}
                  />
                </div>
              </div>
              <span className="w-6 text-right text-xs text-gray-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
