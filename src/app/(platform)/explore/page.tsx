"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Megaphone,
  Hash,
  Lightbulb,
  Users,
  LayoutGrid,
  List,
  ArrowUpDown,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Heart,
  MessageSquare,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { trpc } from "@/lib/trpc";

type EntityType = "campaign" | "channel" | "idea" | "user";
type SortBy = "date" | "name" | "comments" | "votes" | "status";
type SortOrder = "asc" | "desc";
type ViewMode = "tile" | "list";

const ENTITY_TABS: { type: EntityType; label: string; icon: React.ElementType }[] = [
  { type: "campaign", label: "Campaigns", icon: Megaphone },
  { type: "channel", label: "Channels", icon: Hash },
  { type: "idea", label: "Ideas", icon: Lightbulb },
  { type: "user", label: "Users", icon: Users },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "name", label: "Name" },
  { value: "comments", label: "Comments" },
  { value: "votes", label: "Votes" },
  { value: "status", label: "Status" },
];

export default function ExplorePage() {
  const [entityType, setEntityType] = React.useState<EntityType>("campaign");
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortBy>("date");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc");
  const [viewMode, setViewMode] = React.useState<ViewMode>("tile");
  const [saveName, setSaveName] = React.useState("");
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);

  const exploreQuery = trpc.search.explore.useQuery({
    entityType,
    limit: 20,
    search: search || undefined,
    sortBy,
    sortOrder,
  });

  const savedSearchesQuery = trpc.search.savedSearches.useQuery();
  const saveSearchMutation = trpc.search.saveSearch.useMutation({
    onSuccess: () => {
      savedSearchesQuery.refetch();
      setShowSaveDialog(false);
      setSaveName("");
    },
  });
  const deleteSavedSearchMutation = trpc.search.deleteSavedSearch.useMutation({
    onSuccess: () => {
      savedSearchesQuery.refetch();
    },
  });

  const handleSaveSearch = () => {
    if (!saveName.trim() || !search.trim()) return;
    saveSearchMutation.mutate({
      name: saveName,
      query: search,
      filters: { entityType, sortBy, sortOrder },
    });
  };

  const handleLoadSavedSearch = (saved: {
    query: string;
    filters: Record<string, unknown> | null;
  }) => {
    setSearch(saved.query);
    if (saved.filters) {
      if (typeof saved.filters.entityType === "string") {
        setEntityType(saved.filters.entityType as EntityType);
      }
      if (typeof saved.filters.sortBy === "string") {
        setSortBy(saved.filters.sortBy as SortBy);
      }
      if (typeof saved.filters.sortOrder === "string") {
        setSortOrder(saved.filters.sortOrder as SortOrder);
      }
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Explore</h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover campaigns, channels, ideas, and people across the platform.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search across the platform..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {search && (
          <div className="flex gap-2">
            {showSaveDialog ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search name..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveSearch();
                    if (e.key === "Escape") setShowSaveDialog(false);
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveSearch}
                  disabled={!saveName.trim() || saveSearchMutation.isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(true)}>
                <BookmarkPlus className="mr-1.5 h-4 w-4" />
                Save Search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Saved searches */}
      {savedSearchesQuery.data && savedSearchesQuery.data.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Bookmark className="h-4 w-4 text-gray-400" />
          {savedSearchesQuery.data.map((saved) => (
            <div key={saved.id} className="group flex items-center gap-1">
              <button
                onClick={() => handleLoadSavedSearch(saved)}
                className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-100"
              >
                {saved.name}
              </button>
              <button
                onClick={() => deleteSavedSearchMutation.mutate({ id: saved.id })}
                className="hidden rounded p-0.5 text-gray-400 hover:text-red-500 group-hover:block"
                aria-label={`Delete saved search: ${saved.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Entity type tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
          {ENTITY_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.type}
                onClick={() => setEntityType(tab.type)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  entityType === tab.type
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={toggleSortOrder}
            className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-700"
            aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>

          {/* View mode toggle */}
          <div className="flex rounded-md border border-gray-200">
            <button
              onClick={() => setViewMode("tile")}
              className={`rounded-l-md p-2 ${
                viewMode === "tile"
                  ? "bg-gray-100 text-gray-900"
                  : "bg-white text-gray-400 hover:text-gray-600"
              }`}
              aria-label="Tile view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-r-md border-l border-gray-200 p-2 ${
                viewMode === "list"
                  ? "bg-gray-100 text-gray-900"
                  : "bg-white text-gray-400 hover:text-gray-600"
              }`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {exploreQuery.isLoading && (
        <div
          className={viewMode === "tile" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`animate-pulse rounded-xl border border-gray-200 bg-gray-50 ${
                viewMode === "tile" ? "h-48" : "h-20"
              }`}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {exploreQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load results. Please try again.</p>
        </div>
      )}

      {/* Empty state */}
      {exploreQuery.data && exploreQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search ? "Try adjusting your search or filters." : `No ${entityType}s to display yet.`}
          </p>
        </div>
      )}

      {/* Results */}
      {exploreQuery.data && exploreQuery.data.items.length > 0 && (
        <>
          {viewMode === "tile" ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {exploreQuery.data.items.map((item) => (
                <ExploreCard key={item.id} item={item} entityType={entityType} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {exploreQuery.data.items.map((item) => (
                <ExploreListItem key={item.id} item={item} entityType={entityType} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface ExploreItemData {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

function getItemUrl(item: ExploreItemData, entityType: EntityType): string {
  switch (entityType) {
    case "campaign":
      return `/campaigns/${item.id}`;
    case "channel":
      return `/channels/${item.id}`;
    case "idea": {
      const campaignId = item.metadata.campaignId as string | undefined;
      return campaignId ? `/campaigns/${campaignId}/ideas/${item.id}` : `/ideas/${item.id}`;
    }
    case "user":
      return `/profile/${item.id}`;
  }
}

function ExploreCard({ item, entityType }: { item: ExploreItemData; entityType: EntityType }) {
  const url = getItemUrl(item, entityType);

  return (
    <Link href={url}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base group-hover:text-primary-600">
              {item.title}
            </CardTitle>
            {item.status && (
              <StatusBadge status={item.status as Parameters<typeof StatusBadge>[0]["status"]} />
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {item.description && (
            <p className="line-clamp-3 text-sm text-gray-500">{item.description}</p>
          )}
          {entityType === "idea" && (
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {(item.metadata.likesCount as number) ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {(item.metadata.commentsCount as number) ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {(item.metadata.viewsCount as number) ?? 0}
              </span>
            </div>
          )}
          {entityType === "user" && Array.isArray(item.metadata.skills) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(item.metadata.skills as string[]).slice(0, 3).map((skill: string) => (
                <span
                  key={skill}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-gray-400">
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          {entityType === "campaign" && (
            <span className="ml-auto">{(item.metadata.ideaCount as number) ?? 0} ideas</span>
          )}
          {entityType === "channel" && (
            <span className="ml-auto">{(item.metadata.memberCount as number) ?? 0} members</span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}

function ExploreListItem({ item, entityType }: { item: ExploreItemData; entityType: EntityType }) {
  const url = getItemUrl(item, entityType);

  return (
    <Link href={url}>
      <div className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-gray-900 group-hover:text-primary-600">
              {item.title}
            </h3>
            {item.status && (
              <StatusBadge status={item.status as Parameters<typeof StatusBadge>[0]["status"]} />
            )}
          </div>
          {item.description && (
            <p className="mt-1 truncate text-sm text-gray-500">{item.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs text-gray-400">
          {entityType === "idea" && (
            <>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {(item.metadata.likesCount as number) ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {(item.metadata.commentsCount as number) ?? 0}
              </span>
            </>
          )}
          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );
}
