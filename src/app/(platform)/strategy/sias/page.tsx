"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiaCard } from "@/components/sias/SiaCard";
import { SiaFormDialog } from "@/components/sias/SiaFormDialog";
import { Target, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type StatusFilter = "all" | "active" | "archived";

export default function SiasPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const isActiveFilter =
    statusFilter === "active" ? true : statusFilter === "archived" ? false : undefined;

  const siasQuery = trpc.sia.list.useQuery({
    limit: 50,
    search: search || undefined,
    isActive: isActiveFilter,
    sortBy: "name",
    sortDirection: "asc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.sia.create.useMutation({
    onSuccess: () => {
      toast.success("Innovation Area created");
      setShowCreateDialog(false);
      utils.sia.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: { name: string; description: string; color: string }) => {
    createMutation.mutate({
      name: data.name,
      description: data.description || undefined,
      color: data.color,
    });
  };

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
          <Target className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Strategic Innovation Areas
            </h1>
            <p className="text-sm text-gray-500">
              Define long-term innovation themes and link campaigns, ideas, and trends
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Innovation Area
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search innovation areas..."
            className="pl-9"
          />
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

      {/* Content */}
      {siasQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {siasQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load innovation areas. Please try again.</p>
        </div>
      )}

      {siasQuery.data && siasQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
            No Innovation Areas yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first Strategic Innovation Area to start aligning campaigns with strategy.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Innovation Area
          </Button>
        </div>
      )}

      {siasQuery.data && siasQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siasQuery.data.items.map((sia) => (
            <SiaCard key={sia.id} sia={sia} onClick={(id) => router.push(`/strategy/sias/${id}`)} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <SiaFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
