"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface SourceIdea {
  id: string;
  title: string;
  description: string | null;
  contributor?: { name: string | null; email: string } | null;
}

interface MergeIdeasDialogProps {
  sourceIdeas: SourceIdea[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MergeIdeasDialog({
  sourceIdeas,
  open,
  onOpenChange,
  onSuccess,
}: MergeIdeasDialogProps) {
  const [targetIdeaId, setTargetIdeaId] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Auto-select first idea as target when dialog opens
  React.useEffect(() => {
    if (open && sourceIdeas.length > 0) {
      setTargetIdeaId(sourceIdeas[0]?.id ?? "");
    }
  }, [open, sourceIdeas]);

  const mergeMutation = trpc.idea.merge.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      setTargetIdeaId("");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!targetIdeaId) {
      setError("Please select a target idea");
      return;
    }

    const sourceIdeaIds = sourceIdeas.filter((i) => i.id !== targetIdeaId).map((i) => i.id);

    if (sourceIdeaIds.length === 0) {
      setError("At least one source idea is required");
      return;
    }

    mergeMutation.mutate({
      targetIdeaId,
      sourceIdeaIds,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Merge Ideas</DialogTitle>
        </DialogHeader>

        <div className="mb-4 space-y-2">
          <p className="text-sm text-gray-500">
            Select the target idea to merge into. All other selected ideas will be archived, and
            their comments, votes, and contributors will be attributed to the target.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-gray-400">
              Select target idea (the one that will be kept):
            </p>
            {sourceIdeas.map((idea) => (
              <label
                key={idea.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                  targetIdeaId === idea.id
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="targetIdea"
                  value={idea.id}
                  checked={targetIdeaId === idea.id}
                  onChange={(e) => setTargetIdeaId(e.target.value)}
                  className="mt-0.5 h-4 w-4 text-primary-600"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">{idea.title}</span>
                  {idea.contributor && (
                    <span className="ml-1 text-xs text-gray-400">
                      by {idea.contributor.name ?? idea.contributor.email}
                    </span>
                  )}
                  {idea.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">{idea.description}</p>
                  )}
                  {targetIdeaId === idea.id && (
                    <span className="mt-1 inline-block text-xs font-medium text-primary-600">
                      Target (will be kept)
                    </span>
                  )}
                  {targetIdeaId !== idea.id && targetIdeaId && (
                    <span className="mt-1 inline-block text-xs text-gray-400">
                      Will be merged and archived
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mergeMutation.isPending || !targetIdeaId}>
              {mergeMutation.isPending ? "Merging..." : "Merge Ideas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
