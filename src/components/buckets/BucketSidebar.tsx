"use client";

import { Folder, Sparkles, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

interface BucketSidebarProps {
  campaignId: string;
  selectedBucketId: string | null;
  onSelectBucket: (bucketId: string | null) => void;
  onCreateBucket: () => void;
}

export function BucketSidebar({
  campaignId,
  selectedBucketId,
  onSelectBucket,
  onCreateBucket,
}: BucketSidebarProps) {
  const sidebarQuery = trpc.bucket.sidebar.useQuery({ campaignId });

  if (sidebarQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-md bg-gray-100" />
        ))}
      </div>
    );
  }

  const buckets = sidebarQuery.data ?? [];

  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Buckets</h3>
        <Button variant="ghost" size="sm" onClick={onCreateBucket} className="h-7 w-7 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <button
        onClick={() => onSelectBucket(null)}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
          selectedBucketId === null
            ? "bg-primary-50 font-medium text-primary-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Folder className="h-4 w-4 shrink-0" />
        <span className="truncate">All Ideas</span>
      </button>

      {buckets.map((bucket) => (
        <button
          key={bucket.id}
          onClick={() => onSelectBucket(bucket.id)}
          className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
            selectedBucketId === bucket.id
              ? "bg-primary-50 font-medium text-primary-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: bucket.color }}
          />
          {bucket.type === "SMART" && <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />}
          <span className="truncate">{bucket.name}</span>
          <span className="ml-auto shrink-0 text-xs text-gray-400">{bucket.ideaCount}</span>
        </button>
      ))}

      {buckets.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No buckets yet</p>}
    </div>
  );
}
