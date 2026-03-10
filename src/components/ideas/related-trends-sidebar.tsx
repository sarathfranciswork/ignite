"use client";

import type { TrendCard } from "@/types/campaign-sia";

// ============================================================
// Related Trends Sidebar (Story 9.6)
//
// Shown in the idea submission form when the campaign has SIA links.
// Contributors can link their idea to a trend with one click.
// ============================================================

interface RelatedTrendsSidebarProps {
  /** Trends related to the campaign's SIAs */
  trends: TrendCard[];
  /** IDs of trends already linked to this idea */
  linkedTrendIds: string[];
  /** Callback when user clicks to link/unlink a trend */
  onToggleTrend: (trendId: string) => void;
  /** Loading state */
  isLoading?: boolean;
}

export function RelatedTrendsSidebar({
  trends,
  linkedTrendIds,
  onToggleTrend,
  isLoading = false,
}: RelatedTrendsSidebarProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-md" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return null;
  }

  return (
    <aside className="space-y-3" data-testid="related-trends-sidebar">
      <h3 className="text-sm font-semibold text-gray-700">Related Trends</h3>
      <p className="text-xs text-gray-500">
        Link your idea to relevant trends from this campaign&apos;s strategic
        areas.
      </p>

      <ul className="space-y-2">
        {trends.map((trend) => {
          const isLinked = linkedTrendIds.includes(trend.id);
          return (
            <li key={trend.id}>
              <button
                type="button"
                onClick={() => onToggleTrend(trend.id)}
                className={`w-full rounded-md border p-3 text-left transition-all ${
                  isLinked
                    ? "border-blue-300 bg-blue-50 ring-1 ring-blue-200"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                }`}
                data-testid={`trend-link-${trend.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <TrendTypeDot type={trend.type} />
                      <span className="text-xs text-gray-400 truncate">
                        {trend.siaName}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {trend.title}
                    </p>
                    {trend.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {trend.description}
                      </p>
                    )}
                  </div>

                  {/* Link/Unlink indicator */}
                  <div
                    className={`flex-shrink-0 mt-0.5 ${
                      isLinked ? "text-blue-600" : "text-gray-300"
                    }`}
                  >
                    {isLinked ? (
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function TrendTypeDot({ type }: { type: TrendCard["type"] }) {
  const colors = {
    MEGA: "bg-red-400",
    MACRO: "bg-orange-400",
    MICRO: "bg-green-400",
  };

  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[type]}`}
      title={`${type.charAt(0) + type.slice(1).toLowerCase()} Trend`}
    />
  );
}
