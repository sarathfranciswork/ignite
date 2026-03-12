"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TechnologyCard } from "@/components/technologies/TechnologyCard";
import { TechnologyFormDialog } from "@/components/technologies/TechnologyFormDialog";
import { Cpu, Plus, Search } from "lucide-react";
import { toast } from "sonner";

type MaturityLevel = "EMERGING" | "GROWING" | "MATURE" | "DECLINING";
type MaturityFilter = "all" | MaturityLevel;
type StatusFilter = "all" | "active" | "archived";

export default function TechnologiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [maturityFilter, setMaturityFilter] = useState<MaturityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const maturityParam = maturityFilter === "all" ? undefined : maturityFilter;
  const isArchivedParam =
    statusFilter === "active" ? false : statusFilter === "archived" ? true : undefined;

  const technologiesQuery = trpc.technology.list.useQuery({
    limit: 50,
    search: search || undefined,
    maturityLevel: maturityParam,
    isArchived: isArchivedParam,
    sortBy: "title",
    sortDirection: "asc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.technology.create.useMutation({
    onSuccess: () => {
      toast.success("Technology created");
      setShowCreateDialog(false);
      utils.technology.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: {
    title: string;
    description: string;
    maturityLevel: MaturityLevel | null;
    sourceUrl: string;
    isConfidential: boolean;
  }) => {
    createMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      maturityLevel: data.maturityLevel ?? undefined,
      sourceUrl: data.sourceUrl || undefined,
      isConfidential: data.isConfidential,
    });
  };

  const maturityFilters: { label: string; value: MaturityFilter }[] = [
    { label: "All Levels", value: "all" },
    { label: "Emerging", value: "EMERGING" },
    { label: "Growing", value: "GROWING" },
    { label: "Mature", value: "MATURE" },
    { label: "Declining", value: "DECLINING" },
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
          <Cpu className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Technologies</h1>
            <p className="text-sm text-gray-500">
              Technology database with classifications and links to strategic areas
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Technology
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technologies..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {maturityFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setMaturityFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                maturityFilter === f.value
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
      {technologiesQuery.isLoading && (
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
      {technologiesQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load technologies. Please try again.</p>
        </div>
      )}

      {/* Empty state */}
      {technologiesQuery.data && technologiesQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Cpu className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
            No technologies yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Start building your technology database to track and classify technologies.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Technology
          </Button>
        </div>
      )}

      {/* Technology grid */}
      {technologiesQuery.data && technologiesQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {technologiesQuery.data.items.map((tech) => (
            <TechnologyCard
              key={tech.id}
              technology={tech}
              onClick={(id) => router.push(`/strategy/technologies/${id}`)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <TechnologyFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
