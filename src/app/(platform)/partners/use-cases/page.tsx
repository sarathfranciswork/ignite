"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, LayoutGrid, BarChart3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UseCaseCard } from "@/components/useCases/UseCaseCard";
import { UseCasePipelineBoard } from "@/components/useCases/UseCasePipelineBoard";
import { UseCaseFunnelView } from "@/components/useCases/UseCaseFunnelView";
import { trpc } from "@/lib/trpc";

type StatusFilter =
  | "IDENTIFIED"
  | "QUALIFICATION"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED"
  | undefined;

type ViewMode = "pipeline" | "grid" | "funnel";

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: undefined },
  { label: "Identified", value: "IDENTIFIED" },
  { label: "Qualification", value: "QUALIFICATION" },
  { label: "Evaluation", value: "EVALUATION" },
  { label: "Pilot", value: "PILOT" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Archived", value: "ARCHIVED" },
];

export default function UseCasesPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(undefined);
  const [viewMode, setViewMode] = React.useState<ViewMode>("pipeline");

  const useCasesQuery = trpc.useCase.list.useQuery({
    limit: 50,
    search: search || undefined,
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Use Case Pipeline</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track use cases through the partner engagement pipeline.
          </p>
        </div>
        <Link href="/partners/use-cases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Use Case
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search use cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "pipeline"
                  ? "bg-primary-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "grid"
                  ? "bg-primary-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("funnel")}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "funnel"
                  ? "bg-primary-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {viewMode === "pipeline" && <UseCasePipelineBoard />}

      {viewMode === "funnel" && <UseCaseFunnelView />}

      {viewMode === "grid" && (
        <>
          {useCasesQuery.isLoading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
                />
              ))}
            </div>
          )}

          {useCasesQuery.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-600">Failed to load use cases. Please try again.</p>
            </div>
          )}

          {useCasesQuery.data && useCasesQuery.data.items.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <h3 className="mt-4 text-lg font-medium text-gray-900">No use cases found</h3>
              <p className="mt-2 text-sm text-gray-500">
                {search || statusFilter
                  ? "Try adjusting your filters."
                  : "Get started by creating your first use case."}
              </p>
              {!search && !statusFilter && (
                <Link href="/partners/use-cases/new" className="mt-4 inline-block">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Use Case
                  </Button>
                </Link>
              )}
            </div>
          )}

          {useCasesQuery.data && useCasesQuery.data.items.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {useCasesQuery.data.items.map((uc) => (
                <UseCaseCard key={uc.id} useCase={uc} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
