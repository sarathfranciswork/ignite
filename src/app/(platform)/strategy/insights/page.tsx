"use client";

import { useState, useCallback } from "react";
import type {
  InsightType,
  InsightScope,
  InsightSummary,
  InsightCreateInput,
} from "@/types/insight";
import { InsightFeed } from "@/components/strategy/insight-feed";
import { InsightCreateForm } from "@/components/strategy/insight-create-form";

/**
 * Strategy > Insights page — Story 9.4 (FR79)
 *
 * Displays a feed of community insights sorted by newest first.
 * Users can filter by type, scope, and search text.
 * Authenticated users can share new insights via a form dialog.
 *
 * Note: This page is wired to use tRPC hooks once the tRPC client is configured.
 * Currently it defines the UI structure and state management pattern.
 */
export default function InsightsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<{
    insightType?: InsightType;
    scope?: InsightScope;
    search?: string;
  }>({});

  // Placeholder state — will be replaced with tRPC query hooks:
  //   const { data, isLoading, fetchNextPage, hasNextPage } =
  //     trpc.strategy.insights.list.useInfiniteQuery(
  //       { ...filters, limit: 20 },
  //       { getNextPageParam: (last) => last.nextCursor },
  //     );
  const [insights] = useState<InsightSummary[]>([]);
  const [isLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInsightClick = useCallback((id: string) => {
    // Navigate to insight detail — will use Next.js router:
    //   router.push(`/strategy/insights/${id}`);
    void id;
  }, []);

  const handleLoadMore = useCallback(() => {
    // Trigger next page fetch:
    //   fetchNextPage();
  }, []);

  const handleCreate = useCallback(async (data: InsightCreateInput) => {
    setIsSubmitting(true);
    try {
      // Call tRPC mutation:
      //   await trpc.strategy.insights.create.mutate(data);
      void data;
      setShowCreateForm(false);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Community Insights
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Signals and observations from across the organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Share Insight
        </button>
      </div>

      {/* Create form modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <InsightCreateForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Feed */}
      <InsightFeed
        insights={insights}
        isLoading={isLoading}
        hasMore={false}
        onLoadMore={handleLoadMore}
        onInsightClick={handleInsightClick}
        filters={filters}
        onFilterChange={setFilters}
      />
    </div>
  );
}
