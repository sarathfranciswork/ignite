"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PortfolioCard } from "@/components/portfolios/PortfolioCard";
import { PortfolioFormDialog } from "@/components/portfolios/PortfolioFormDialog";
import { Layers, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function PortfoliosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const portfoliosQuery = trpc.portfolio.list.useQuery({
    limit: 50,
    search: search || undefined,
    sortBy: "updatedAt",
    sortDirection: "desc",
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.portfolio.create.useMutation({
    onSuccess: (data) => {
      toast.success("Portfolio created");
      setShowCreateDialog(false);
      utils.portfolio.list.invalidate();
      router.push(`/strategy/portfolios/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (data: { title: string; description: string }) => {
    createMutation.mutate({
      title: data.title,
      description: data.description || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Innovation Portfolios</h1>
            <p className="text-sm text-gray-500">
              Visual collections linking trends, technologies, ideas, and SIAs
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Portfolio
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search portfolios..."
            className="pl-9"
          />
        </div>
      </div>

      {portfoliosQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {portfoliosQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600">Failed to load portfolios. Please try again.</p>
        </div>
      )}

      {portfoliosQuery.data && portfoliosQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Layers className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">
            No Portfolios yet
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first Innovation Portfolio to group and analyze strategic items.
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        </div>
      )}

      {portfoliosQuery.data && portfoliosQuery.data.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfoliosQuery.data.items.map((portfolio) => (
            <PortfolioCard
              key={portfolio.id}
              portfolio={portfolio}
              onClick={(id) => router.push(`/strategy/portfolios/${id}`)}
            />
          ))}
        </div>
      )}

      <PortfolioFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        mode="create"
      />
    </div>
  );
}
