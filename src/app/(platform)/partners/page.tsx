"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Plus, Search, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { OrganizationListRow } from "@/components/organizations/OrganizationListRow";
import {
  OrganizationFilters,
  type OrganizationFilterValues,
} from "@/components/organizations/OrganizationFilters";
import { trpc } from "@/lib/trpc";

type ViewMode = "tile" | "list";

const DEFAULT_FILTERS: OrganizationFilterValues = {
  relationshipStatus: undefined,
  industries: [],
  location: "",
  ndaStatus: undefined,
  isConfidential: undefined,
  sortBy: "name",
  sortDirection: "asc",
};

export default function PartnersPage() {
  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("tile");
  const [filters, setFilters] = React.useState<OrganizationFilterValues>(DEFAULT_FILTERS);

  const organizationsQuery = trpc.organization.list.useQuery({
    limit: 20,
    search: search || undefined,
    relationshipStatus: filters.relationshipStatus,
    industries: filters.industries.length > 0 ? filters.industries : undefined,
    location: filters.location || undefined,
    ndaStatus: filters.ndaStatus,
    isConfidential: filters.isConfidential,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Search, explore, and manage partner organizations.
          </p>
        </div>
        <Link href="/partners/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name, website, industry, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setViewMode("tile")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "tile"
                ? "bg-primary-600 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-label="Tile view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-primary-600 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <OrganizationFilters filters={filters} onFiltersChange={setFilters} />

      {organizationsQuery.isLoading && (
        <div
          className={viewMode === "tile" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`animate-pulse rounded-xl border border-gray-200 bg-gray-50 ${
                viewMode === "tile" ? "h-52" : "h-16"
              }`}
            />
          ))}
        </div>
      )}

      {organizationsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load organizations. Please try again.</p>
        </div>
      )}

      {organizationsQuery.data && organizationsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No organizations found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search || filters.relationshipStatus || filters.industries.length > 0
              ? "Try adjusting your search or filters."
              : "Get started by adding your first partner organization."}
          </p>
          {!search && !filters.relationshipStatus && filters.industries.length === 0 && (
            <Link href="/partners/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </Link>
          )}
        </div>
      )}

      {organizationsQuery.data &&
        organizationsQuery.data.items.length > 0 &&
        viewMode === "tile" && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {organizationsQuery.data.items.map((org) => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        )}

      {organizationsQuery.data &&
        organizationsQuery.data.items.length > 0 &&
        viewMode === "list" && (
          <div className="space-y-2">
            {organizationsQuery.data.items.map((org) => (
              <OrganizationListRow key={org.id} organization={org} />
            ))}
          </div>
        )}
    </div>
  );
}
