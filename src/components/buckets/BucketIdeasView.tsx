"use client";

import * as React from "react";
import { Trash2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { Button } from "@/components/ui/button";

interface BucketIdeasViewProps {
  bucketId: string;
  campaignId: string;
}

export function BucketIdeasView({ bucketId, campaignId }: BucketIdeasViewProps) {
  const utils = trpc.useUtils();

  const bucketQuery = trpc.bucket.getById.useQuery({ id: bucketId });
  const ideasQuery = trpc.bucket.listIdeas.useQuery({ bucketId, limit: 50 });

  const unassignMutation = trpc.bucket.unassignIdea.useMutation({
    onSuccess: () => {
      void utils.bucket.listIdeas.invalidate({ bucketId });
      void utils.bucket.sidebar.invalidate({ campaignId });
    },
  });

  const deleteMutation = trpc.bucket.delete.useMutation({
    onSuccess: () => {
      void utils.bucket.sidebar.invalidate({ campaignId });
      void utils.bucket.list.invalidate({ campaignId });
    },
  });

  if (bucketQuery.isLoading || ideasQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const bucket = bucketQuery.data;
  const ideas = ideasQuery.data?.items ?? [];
  const isSmartBucket = bucket?.type === "SMART";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: bucket?.color ?? "#6366F1" }}
          />
          <h2 className="text-lg font-semibold text-gray-900">{bucket?.name}</h2>
          {isSmartBucket && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Sparkles className="h-3 w-3" />
              Smart
            </span>
          )}
          <span className="text-sm text-gray-500">({ideas.length} ideas)</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("Delete this bucket? Ideas will not be deleted.")) {
              deleteMutation.mutate({ id: bucketId });
            }
          }}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>

      {bucket?.description && <p className="text-sm text-gray-500">{bucket.description}</p>}

      {ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            {isSmartBucket
              ? "No ideas match the filter criteria."
              : "No ideas assigned yet. Assign ideas from the Ideas tab."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((item) => (
            <div key={item.idea.id} className="relative">
              <IdeaCard idea={item.idea} />
              {!isSmartBucket && (
                <button
                  onClick={() => unassignMutation.mutate({ bucketId, ideaId: item.idea.id })}
                  className="absolute right-2 top-2 rounded-full bg-white p-1 text-gray-400 shadow-sm transition-colors hover:text-red-500"
                  title="Remove from bucket"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
