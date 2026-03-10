"use client";

import * as React from "react";
import { Search, Plus, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdeaCard } from "./IdeaCard";
import { IdeaForm } from "./IdeaForm";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type IdeaStatusFilter =
  | "DRAFT"
  | "QUALIFICATION"
  | "COMMUNITY_DISCUSSION"
  | "HOT"
  | "EVALUATION"
  | "SELECTED_IMPLEMENTATION"
  | "IMPLEMENTED"
  | "ARCHIVED";

type IdeaStatus = IdeaStatusFilter;

interface IdeaListItem {
  id: string;
  title: string;
  teaser: string | null;
  status: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  contributor?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
}

const STATUS_OPTIONS: { value: IdeaStatusFilter; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "COMMUNITY_DISCUSSION", label: "Community Discussion" },
  { value: "HOT", label: "Hot" },
  { value: "EVALUATION", label: "Evaluation" },
  { value: "SELECTED_IMPLEMENTATION", label: "Selected" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "ARCHIVED", label: "Archived" },
];

interface CampaignIdeasTabProps {
  campaignId: string;
  campaignStatus: string;
}

export function CampaignIdeasTab({ campaignId, campaignStatus }: CampaignIdeasTabProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<IdeaStatusFilter | undefined>();
  const [showNewIdeaDialog, setShowNewIdeaDialog] = React.useState(false);

  const ideasQuery = trpc.idea.list.useQuery({
    campaignId,
    limit: 20,
    search: search || undefined,
    status: statusFilter,
  }) as {
    data: { items: IdeaListItem[]; nextCursor?: string } | undefined;
    isLoading: boolean;
    isError: boolean;
  };

  const canSubmitIdeas = ["SEEDING", "SUBMISSION"].includes(campaignStatus);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search ideas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            value={statusFilter ?? ""}
            onChange={(e) =>
              setStatusFilter(e.target.value ? (e.target.value as IdeaStatusFilter) : undefined)
            }
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {canSubmitIdeas && (
            <>
              <Button size="sm" onClick={() => setShowNewIdeaDialog(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New Idea
              </Button>
              <Dialog open={showNewIdeaDialog} onOpenChange={setShowNewIdeaDialog}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit a New Idea</DialogTitle>
                  </DialogHeader>
                  <IdeaForm campaignId={campaignId} onSuccess={() => setShowNewIdeaDialog(false)} />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {ideasQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      )}

      {ideasQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load ideas. Please try again.</p>
        </div>
      )}

      {ideasQuery.data && ideasQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No ideas yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {canSubmitIdeas
              ? "Be the first to submit an idea for this campaign."
              : "Ideas will appear here once the campaign accepts submissions."}
          </p>
        </div>
      )}

      {ideasQuery.data && ideasQuery.data.items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideasQuery.data.items.map((idea) => (
              <IdeaCard key={idea.id} idea={{ ...idea, status: idea.status as IdeaStatus }} />
            ))}
          </div>

          {ideasQuery.data.nextCursor && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm">
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
