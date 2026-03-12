"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Table2, BarChart3, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsTable } from "@/components/evaluation/ResultsTable";
import { ResultsBubbleChart } from "@/components/evaluation/ResultsBubbleChart";
import { ShortlistPanel } from "@/components/evaluation/ShortlistPanel";
import { trpc } from "@/lib/trpc";

type ViewMode = "table" | "chart";

export default function EvaluationResultsPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [selectedIdeaIds, setSelectedIdeaIds] = React.useState<Set<string>>(new Set());

  const sessionQuery = trpc.evaluation.getById.useQuery(
    { id: params.sessionId },
    { enabled: !!params.sessionId },
  );

  const scorecardResultsQuery = trpc.evaluation.results.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!params.sessionId && sessionQuery.data?.type === "SCORECARD" },
  );

  const pairwiseResultsQuery = trpc.evaluation.pairwiseResults.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!params.sessionId && sessionQuery.data?.type === "PAIRWISE" },
  );

  const shortlistQuery = trpc.evaluation.shortlistGet.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!params.sessionId },
  );

  const addToShortlist = trpc.evaluation.shortlistAdd.useMutation({
    onSuccess: () => {
      void scorecardResultsQuery.refetch();
      void pairwiseResultsQuery.refetch();
      void shortlistQuery.refetch();
    },
  });

  const removeFromShortlist = trpc.evaluation.shortlistRemove.useMutation({
    onSuccess: () => {
      void scorecardResultsQuery.refetch();
      void pairwiseResultsQuery.refetch();
      void shortlistQuery.refetch();
    },
  });

  const handleToggleShortlist = (ideaId: string, isCurrentlyShortlisted: boolean) => {
    if (isCurrentlyShortlisted) {
      removeFromShortlist.mutate({ sessionId: params.sessionId, ideaId });
    } else {
      addToShortlist.mutate({ sessionId: params.sessionId, ideaId });
    }
  };

  const handleToggleSelection = React.useCallback((ideaId: string) => {
    setSelectedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else {
        next.add(ideaId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = React.useCallback(() => {
    setSelectedIdeaIds(new Set());
  }, []);

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load evaluation session.</p>
        <Link
          href={`/campaigns/${params.id}`}
          className="mt-2 inline-block text-sm text-primary-600"
        >
          Back to campaign
        </Link>
      </div>
    );
  }

  const session = sessionQuery.data;
  if (!session) return null;

  const isScorecard = session.type === "SCORECARD";
  const resultsData = isScorecard ? scorecardResultsQuery.data : pairwiseResultsQuery.data;
  const isResultsLoading = isScorecard
    ? scorecardResultsQuery.isLoading
    : pairwiseResultsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/campaigns/${params.id}/evaluate/${params.sessionId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Session
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Results: {session.title}</h1>
            <p className="text-sm text-gray-500">
              {isScorecard ? "Scorecard" : "Pairwise"} evaluation results
            </p>
          </div>
        </div>

        {/* View mode toggle (only for scorecard — has bubble chart support) */}
        {isScorecard && (
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Table2 className="mr-1 inline h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "chart"
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BarChart3 className="mr-1 inline h-3.5 w-3.5" />
              Bubble Chart
            </button>
          </div>
        )}
      </div>

      {isResultsLoading ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : resultsData ? (
        <>
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Main content */}
            <div className="lg:col-span-3">
              {(addToShortlist.isPending || removeFromShortlist.isPending) && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating shortlist...
                </div>
              )}
              {viewMode === "table" || !isScorecard ? (
                <ResultsTable
                  type={session.type as "SCORECARD" | "PAIRWISE"}
                  results={resultsData.results}
                  criteria={resultsData.criteria}
                  selectedIdeaIds={selectedIdeaIds}
                  onToggleSelection={handleToggleSelection}
                  onToggleShortlist={handleToggleShortlist}
                  shortlistLocked={shortlistQuery.data?.isLocked}
                />
              ) : (
                <ResultsBubbleChart
                  results={
                    resultsData.results as Array<{
                      ideaId: string;
                      ideaTitle: string;
                      weightedScore: number;
                      criteriaScores: Array<{
                        criterionId: string;
                        criterionTitle: string;
                        average: number;
                        standardDeviation: number;
                      }>;
                    }>
                  }
                  criteria={resultsData.criteria}
                />
              )}
            </div>

            {/* Sidebar — shortlist panel */}
            <div>
              <ShortlistPanel
                sessionId={params.sessionId}
                selectedIdeaIds={selectedIdeaIds}
                onClearSelection={handleClearSelection}
              />
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">Ideas Evaluated</p>
              <p className="text-2xl font-bold text-gray-900">{resultsData.results.length}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">Criteria</p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  resultsData.criteria.filter(
                    (c: { fieldType: string }) => c.fieldType === "SELECTION_SCALE",
                  ).length
                }
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">Shortlisted</p>
              <p className="text-2xl font-bold text-yellow-600">
                <Star className="mr-1 inline h-5 w-5 fill-yellow-400 text-yellow-400" />
                {shortlistQuery.data?.entries?.length ?? shortlistQuery.data?.items?.length ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">Evaluation Type</p>
              <p className="text-2xl font-bold text-gray-900">
                {isScorecard ? "Scorecard" : "Pairwise"}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Results Yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Results will appear once evaluators have submitted their responses.
          </p>
        </div>
      )}
    </div>
  );
}
