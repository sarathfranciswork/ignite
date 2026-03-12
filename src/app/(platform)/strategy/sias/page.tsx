"use client";

import * as React from "react";
import Link from "next/link";
import { Target, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiaCard } from "@/components/sias/SiaCard";
import type { SiaCardProps } from "@/components/sias/SiaCard";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermission } from "@/hooks/usePermission";
import { Action } from "@/lib/permissions";

type ActiveFilter = boolean | undefined;

const STATUS_FILTERS: { label: string; value: ActiveFilter }[] = [
  { label: "All", value: undefined },
  { label: "Active", value: true },
  { label: "Archived", value: false },
];

export default function SiasPage() {
  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>(true);
  const debouncedSearch = useDebounce(search, 300);
  const canCreate = usePermission(Action.SIA_CREATE);

  const siasQuery = trpc.sia.list.useQuery({
    limit: 20,
    search: debouncedSearch || undefined,
    isActive: activeFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Strategic Innovation Areas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Define long-term innovation themes and goals. Link campaigns, ideas, and technologies to
            strategic areas.
          </p>
        </div>
        {canCreate && (
          <Link href="/strategy/sias/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New SIA
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search strategic areas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {siasQuery.isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {siasQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">
            Failed to load strategic innovation areas. Please try again.
          </p>
        </div>
      )}

      {siasQuery.data && siasQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No strategic innovation areas found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {search || activeFilter !== undefined
              ? "Try adjusting your filters."
              : "Get started by creating your first strategic innovation area."}
          </p>
          {!search && activeFilter !== false && canCreate && (
            <Link href="/strategy/sias/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create SIA
              </Button>
            </Link>
          )}
        </div>
      )}

      {siasQuery.data && siasQuery.data.items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {siasQuery.data.items.map((sia: SiaCardProps["sia"]) => (
            <SiaCard key={sia.id} sia={sia} />
          ))}
        </div>
      )}
    </div>
  );
}
