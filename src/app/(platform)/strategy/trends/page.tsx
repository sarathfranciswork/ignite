"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendCard } from "@/components/trends/TrendCard";
import { TrendFormDialog } from "@/components/trends/TrendFormDialog";
import { TrendingUp, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type TrendType = "MEGA" | "MACRO" | "MICRO";
type TypeFilter = "all" | TrendType;
type StatusFilter = "all" | "active" | "archived";

export default function TrendsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const typeParam = typeFilter === "all" ? undefined : typeFilter;
  const isArchivedParam =
    statusFilter === "active" ? false : statusFilter === "archived" ? true : undefined;

  const trendsQuery = trpc.trend.list.useQuery({
    limit: 50,
    search: search || undefined,
    type: typeParam,
    isArchived: isArchivedParam,
    sortBy: "title",
    sortDirection: "asc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.trend.create.useMutation({
    onSuccess: () => {
      toast.success("Trend created");
      setShowCreateDialog(false);
      utils.trend.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: {
    title: string;
    description: string;
    type: TrendType;
    sourceUrl: string;
    isConfidential: boolean;
    businessRelevance: number | null;
  }) => {
    createMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      type: data.type,
      sourceUrl: data.sourceUrl || undefined,
      isConfidential: data.isConfidential,
      businessRelevance: data.businessRelevance ?? undefined,
    });
  };

  const typeFilters: { label: string; value: TypeFilter }[] = [
    { label: "All Types", value: "all" },
    { label: "Mega", value: "MEGA" },
    { label: "Macro", value: "MACRO" },
    { label: "Micro", value: "MICRO" },
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
          <TrendingUp className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Trends</h1>
            <p className="text-sm text-gray-500">
              Track mega, macro, and micro trends that drive innovation strategy
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Trend
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trends..."
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
      {trendsQuery.isLoading && (
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
      {trendsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load trends. Please try again.</p>
        </div>
      )}

      {/* Empty state */}
      {trendsQuery.data && trendsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">No trends yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Start building your trend database to inform innovation strategy.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Trend
          </Button>
        </div>
      )}

      {/* Trend grid */}
      {trendsQuery.data && trendsQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trendsQuery.data.items.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              onClick={(id) => router.push(`/strategy/trends/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <TrendFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
