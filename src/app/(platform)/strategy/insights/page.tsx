"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InsightCard } from "@/components/insights/InsightCard";
import { InsightFormDialog } from "@/components/insights/InsightFormDialog";
import { Lightbulb, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type InsightType = "SIGNAL" | "OBSERVATION" | "OPPORTUNITY" | "RISK";
type InsightScope = "GLOBAL" | "CAMPAIGN" | "TREND";
type TypeFilter = "all" | InsightType;
type ScopeFilter = "all" | InsightScope;
type StatusFilter = "all" | "active" | "archived";

export default function InsightsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const typeParam = typeFilter === "all" ? undefined : typeFilter;
  const scopeParam = scopeFilter === "all" ? undefined : scopeFilter;
  const isArchivedParam =
    statusFilter === "active" ? false : statusFilter === "archived" ? true : undefined;

  const insightsQuery = trpc.insight.list.useQuery({
    limit: 50,
    search: search || undefined,
    type: typeParam,
    scope: scopeParam,
    isArchived: isArchivedParam,
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.insight.create.useMutation({
    onSuccess: () => {
      toast.success("Insight shared");
      setShowCreateDialog(false);
      utils.insight.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: {
    title: string;
    description: string;
    type: InsightType;
    scope: InsightScope;
    sourceUrl: string;
    isEditorial: boolean;
  }) => {
    createMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      type: data.type,
      scope: data.scope,
      sourceUrl: data.sourceUrl || undefined,
      isEditorial: data.isEditorial,
    });
  };

  const typeFilters: { label: string; value: TypeFilter }[] = [
    { label: "All Types", value: "all" },
    { label: "Signal", value: "SIGNAL" },
    { label: "Observation", value: "OBSERVATION" },
    { label: "Opportunity", value: "OPPORTUNITY" },
    { label: "Risk", value: "RISK" },
  ];

  const scopeFilters: { label: string; value: ScopeFilter }[] = [
    { label: "All Scopes", value: "all" },
    { label: "Global", value: "GLOBAL" },
    { label: "Campaign", value: "CAMPAIGN" },
    { label: "Trend", value: "TREND" },
  ];

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Community Insights</h1>
            <p className="text-sm text-gray-500">
              Community-generated signals, observations, and opportunities
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Share Insight
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search insights..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {typeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === f.value
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {scopeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setScopeFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                scopeFilter === f.value
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {insightsQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {insightsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load insights. Please try again.</p>
        </div>
      )}

      {/* Empty state */}
      {insightsQuery.data && insightsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">No insights yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Share signals, observations, and opportunities from across the organization.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Share Insight
          </Button>
        </div>
      )}

      {/* Insight grid */}
      {insightsQuery.data && insightsQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {insightsQuery.data.items.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onClick={(id) => router.push(`/strategy/insights/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <InsightFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
