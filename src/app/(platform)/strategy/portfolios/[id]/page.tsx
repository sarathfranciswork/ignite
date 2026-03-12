"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { PortfolioFormDialog } from "@/components/portfolios/PortfolioFormDialog";
import { AddItemDialog } from "@/components/portfolios/AddItemDialog";
import { PortfolioItemCard } from "@/components/portfolios/PortfolioItemCard";
import { ArrowLeft, Plus, Pencil, Trash2, BarChart3, LayoutGrid, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ViewMode = "board" | "analytics";

const TYPE_COLORS: Record<string, string> = {
  TREND: "#10B981",
  TECHNOLOGY: "#F59E0B",
  IDEA: "#3B82F6",
  SIA: "#6366F1",
};

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const portfolioQuery = trpc.portfolio.getById.useQuery({ id });
  const analyticsQuery = trpc.portfolio.analytics.useQuery(
    { id },
    { enabled: viewMode === "analytics" },
  );
  const utils = trpc.useUtils();

  const updateMutation = trpc.portfolio.update.useMutation({
    onSuccess: () => {
      toast.success("Portfolio updated");
      setShowEditDialog(false);
      utils.portfolio.getById.invalidate({ id });
      utils.portfolio.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.portfolio.delete.useMutation({
    onSuccess: () => {
      toast.success("Portfolio deleted");
      router.push("/strategy/portfolios");
    },
    onError: (error) => toast.error(error.message),
  });

  const addItemMutation = trpc.portfolio.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      utils.portfolio.getById.invalidate({ id });
      utils.portfolio.analytics.invalidate({ id });
    },
    onError: (error) => toast.error(error.message),
  });

  const removeItemMutation = trpc.portfolio.removeItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed");
      utils.portfolio.getById.invalidate({ id });
      utils.portfolio.analytics.invalidate({ id });
    },
    onError: (error) => toast.error(error.message),
  });

  const existingEntityIds = useMemo(() => {
    const ids = new Set<string>();
    if (portfolioQuery.data?.items) {
      for (const item of portfolioQuery.data.items) {
        ids.add(item.entityId);
      }
    }
    return ids;
  }, [portfolioQuery.data?.items]);

  const portfolioItems = portfolioQuery.data?.items;
  const bucketGroups = useMemo(() => {
    type ItemArray = NonNullable<typeof portfolioItems>;
    if (!portfolioItems) return new Map<string, ItemArray>();
    const groups = new Map<string, ItemArray>();
    for (const item of portfolioItems) {
      const bucket = item.bucketLabel ?? "Uncategorized";
      if (!groups.has(bucket)) groups.set(bucket, []);
      groups.get(bucket)!.push(item);
    }
    return groups;
  }, [portfolioItems]);

  if (portfolioQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (portfolioQuery.isError || !portfolioQuery.data) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-gray-600">Portfolio not found or failed to load.</p>
        <Button variant="outline" onClick={() => router.push("/strategy/portfolios")}>
          Back to Portfolios
        </Button>
      </div>
    );
  }

  const portfolio = portfolioQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => router.push("/strategy/portfolios")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-gray-900">{portfolio.title}</h1>
          {portfolio.description && (
            <p className="mt-1 text-sm text-gray-500">{portfolio.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-sm ${
                viewMode === "board"
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-sm ${
                viewMode === "analytics"
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Analysis
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => {
              if (window.confirm("Delete this portfolio?")) {
                deleteMutation.mutate({ id });
              }
            }}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {viewMode === "board" && (
        <BoardView
          bucketGroups={bucketGroups}
          onAddClick={() => setShowAddDialog(true)}
          onRemoveItem={(itemId) => removeItemMutation.mutate({ portfolioId: id, itemId })}
        />
      )}

      {viewMode === "analytics" && (
        <AnalyticsView analytics={analyticsQuery.data} isLoading={analyticsQuery.isLoading} />
      )}

      {/* Dialogs */}
      <PortfolioFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={(data) =>
          updateMutation.mutate({
            id,
            title: data.title,
            description: data.description || undefined,
          })
        }
        isLoading={updateMutation.isPending}
        initialData={portfolio}
        mode="edit"
      />

      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={(entityType, entityId) =>
          addItemMutation.mutate({ portfolioId: id, entityType, entityId })
        }
        isLoading={addItemMutation.isPending}
        existingEntityIds={existingEntityIds}
      />
    </div>
  );
}

function BoardView({
  bucketGroups,
  onAddClick,
  onRemoveItem,
}: {
  bucketGroups: Map<
    string,
    Array<{
      id: string;
      entityType: "TREND" | "TECHNOLOGY" | "IDEA" | "SIA";
      entityId: string;
      bucketLabel: string | null;
      position: number;
      createdAt: string;
      entity: {
        title: string;
        description: string | null;
        metadata: Record<string, unknown>;
      } | null;
    }>
  >;
  onAddClick: () => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const totalItems = Array.from(bucketGroups.values()).reduce(
    (sum, items) => sum + items.length,
    0,
  );

  if (totalItems === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <LayoutGrid className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
          Portfolio is empty
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Add trends, technologies, ideas, or SIAs to build your innovation portfolio.
        </p>
        <Button className="mt-4" onClick={onAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Items
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalItems} {totalItems === 1 ? "item" : "items"} across {bucketGroups.size}{" "}
          {bucketGroups.size === 1 ? "bucket" : "buckets"}
        </p>
        <Button size="sm" onClick={onAddClick}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Items
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from(bucketGroups.entries()).map(([bucket, items]) => (
          <div
            key={bucket}
            className="min-w-[280px] max-w-[320px] flex-shrink-0 rounded-xl bg-gray-50 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">{bucket}</h3>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <PortfolioItemCard key={item.id} item={item} onRemove={onRemoveItem} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AnalyticsData {
  totalItems: number;
  typeCounts: Record<string, number>;
  bucketCounts: Record<string, number>;
  siaCoverage: Array<{ id: string; name: string; color: string | null }>;
}

function AnalyticsView({
  analytics,
  isLoading,
}: {
  analytics: AnalyticsData | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!analytics || analytics.totalItems === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
          No data to analyze
        </h3>
        <p className="mt-1 text-sm text-gray-500">Add items to this portfolio to see analytics.</p>
      </div>
    );
  }

  const typeData = Object.entries(analytics.typeCounts)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      name: type,
      value: count,
      color: TYPE_COLORS[type] ?? "#9CA3AF",
    }));

  const bucketData = Object.entries(analytics.bucketCounts).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-display text-lg font-semibold text-gray-900">Item Breakdown</h3>
        <p className="mt-1 text-sm text-gray-500">{analytics.totalItems} total items</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name} (${value})`}
              >
                {typeData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bucket distribution */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-display text-lg font-semibold text-gray-900">Bucket Distribution</h3>
        <p className="mt-1 text-sm text-gray-500">Items grouped by bucket</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SIA Coverage */}
      {analytics.siaCoverage.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold text-gray-900">SIA Coverage</h3>
          <p className="mt-1 text-sm text-gray-500">
            Strategic Innovation Areas represented in this portfolio
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {analytics.siaCoverage.map((sia) => (
              <span
                key={sia.id}
                className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium"
                style={{
                  borderColor: sia.color ?? "#6366F1",
                  color: sia.color ?? "#6366F1",
                }}
              >
                <span
                  className="mr-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: sia.color ?? "#6366F1" }}
                />
                {sia.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
