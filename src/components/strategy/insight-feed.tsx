"use client";

import type {
  InsightSummary,
  InsightType,
  InsightScope,
} from "@/types/insight";
import { InsightCard } from "./insight-card";

interface InsightFeedProps {
  insights: InsightSummary[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onInsightClick: (id: string) => void;
  filters: {
    insightType?: InsightType;
    scope?: InsightScope;
    search?: string;
  };
  onFilterChange: (filters: {
    insightType?: InsightType;
    scope?: InsightScope;
    search?: string;
  }) => void;
}

const INSIGHT_TYPES: Array<{ value: InsightType; label: string }> = [
  { value: "SIGNAL", label: "Signal" },
  { value: "OBSERVATION", label: "Observation" },
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "RISK", label: "Risk" },
];

const SCOPES: Array<{ value: InsightScope; label: string }> = [
  { value: "GLOBAL", label: "Global" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "TREND", label: "Trend" },
];

/**
 * Insights feed component for Strategy > Insights page.
 * Shows a filterable, paginated list of community insights sorted newest-first.
 */
export function InsightFeed({
  insights,
  isLoading,
  hasMore,
  onLoadMore,
  onInsightClick,
  filters,
  onFilterChange,
}: InsightFeedProps) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search insights…"
          value={filters.search ?? ""}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value || undefined })
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />

        <select
          value={filters.insightType ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              insightType: (e.target.value as InsightType) || undefined,
            })
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          {INSIGHT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filters.scope ?? ""}
          onChange={(e) =>
            onFilterChange({
              ...filters,
              scope: (e.target.value as InsightScope) || undefined,
            })
          }
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          aria-label="Filter by scope"
        >
          <option value="">All Scopes</option>
          {SCOPES.map((scope) => (
            <option key={scope.value} value={scope.value}>
              {scope.label}
            </option>
          ))}
        </select>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onClick={onInsightClick}
          />
        ))}
      </div>

      {/* Empty state */}
      {!isLoading && insights.length === 0 && (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">No insights yet</p>
          <p className="mt-1 text-sm">
            Be the first to share an insight with the community.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
