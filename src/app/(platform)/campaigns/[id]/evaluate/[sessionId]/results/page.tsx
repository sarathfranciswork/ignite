"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, List, Star, Loader2 } from "lucide-react";
import { ResultsTable } from "@/components/evaluation/ResultsTable";
import { ResultsBubbleChart } from "@/components/evaluation/ResultsBubbleChart";
import { ShortlistPanel } from "@/components/evaluation/ShortlistPanel";
import { trpc } from "@/lib/trpc";

type ViewTab = "table" | "chart";

export default function EvaluationResultsPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const [activeTab, setActiveTab] = React.useState<ViewTab>("table");

  const resultsQuery = trpc.evaluation.enhancedResults.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!params.sessionId },
  );

  const shortlistQuery = trpc.evaluation.shortlistGet.useQuery(
    { sessionId: params.sessionId },
    { enabled: !!params.sessionId },
  );

  const addToShortlist = trpc.evaluation.shortlistAdd.useMutation({
    onSuccess: () => {
      void resultsQuery.refetch();
      void shortlistQuery.refetch();
    },
  });

  const removeFromShortlist = trpc.evaluation.shortlistRemove.useMutation({
    onSuccess: () => {
      void resultsQuery.refetch();
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

  if (resultsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (resultsQuery.error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">Failed to load results: {resultsQuery.error.message}</p>
      </div>
    );
  }

  const results = resultsQuery.data;
  if (!results) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/campaigns/${params.id}/evaluate/${params.sessionId}`}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{results.sessionTitle}</h1>
            <p className="text-sm text-gray-500">
              {results.type === "SCORECARD" ? "Scorecard" : "Pairwise"} Evaluation Results
              {" \u2022 "}
              {results.results.length} ideas evaluated
            </p>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "table"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="h-4 w-4" />
            Table
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chart")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "chart"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Bubble Chart
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Results view - takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">
                {activeTab === "table" ? "Results Table" : "Bubble Chart"}
              </h2>
            </div>
            <div className="p-4">
              {(addToShortlist.isPending || removeFromShortlist.isPending) && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating shortlist...
                </div>
              )}
              {activeTab === "table" ? (
                <ResultsTable
                  results={results.results}
                  criteria={results.criteria}
                  onToggleShortlist={handleToggleShortlist}
                  shortlistLocked={results.shortlistLocked}
                />
              ) : (
                <ResultsBubbleChart results={results.results} criteria={results.criteria} />
              )}
            </div>
          </div>
        </div>

        {/* Shortlist panel - takes 1 column */}
        <div>
          {shortlistQuery.isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          ) : shortlistQuery.data ? (
            <ShortlistPanel
              sessionId={params.sessionId}
              isLocked={shortlistQuery.data.isLocked}
              items={shortlistQuery.data.items}
              onRefresh={() => {
                void shortlistQuery.refetch();
                void resultsQuery.refetch();
              }}
            />
          ) : null}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">Ideas Evaluated</p>
          <p className="text-2xl font-bold text-gray-900">{results.results.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">Criteria</p>
          <p className="text-2xl font-bold text-gray-900">
            {results.criteria.filter((c) => c.fieldType === "SELECTION_SCALE").length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">Shortlisted</p>
          <p className="text-2xl font-bold text-yellow-600">
            <Star className="mr-1 inline h-5 w-5 fill-yellow-400 text-yellow-400" />
            {results.results.filter((r) => r.isShortlisted).length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-sm text-gray-500">Controversial</p>
          <p className="text-2xl font-bold text-amber-600">
            {results.results.filter((r) => r.isControversial).length}
          </p>
        </div>
      </div>
    </div>
  );
}
