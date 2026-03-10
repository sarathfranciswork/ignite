"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampaignCard } from "@/components/campaigns/CampaignCard";

const STATUS_FILTERS = [
  { value: undefined, label: "All" },
  { value: "DRAFT" as const, label: "Draft" },
  { value: "SEEDING" as const, label: "Seeding" },
  { value: "SUBMISSION" as const, label: "Submission" },
  { value: "DISCUSSION_VOTING" as const, label: "Discussion" },
  { value: "EVALUATION" as const, label: "Evaluation" },
  { value: "CLOSED" as const, label: "Closed" },
] as const;

type StatusFilter =
  | "DRAFT"
  | "SEEDING"
  | "SUBMISSION"
  | "DISCUSSION_VOTING"
  | "EVALUATION"
  | "CLOSED"
  | undefined;

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.campaign.list.useInfiniteQuery(
      { limit: 12, status: statusFilter, search: search || undefined },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const campaigns = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <Megaphone className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-sm text-gray-500">Manage innovation campaigns and challenges</p>
          </div>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <Megaphone className="mb-3 h-10 w-10 text-gray-300" />
          <h3 className="font-display text-lg font-semibold text-gray-900">No campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first campaign to get started</p>
          <Link href="/campaigns/new" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
