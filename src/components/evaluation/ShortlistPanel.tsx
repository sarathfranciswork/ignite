"use client";

import * as React from "react";
import { Lock, Plus, Trash2, ArrowRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface ShortlistPanelProps {
  sessionId: string;
  selectedIdeaIds: Set<string>;
  onClearSelection: () => void;
}

const DESTINATION_LABELS: Record<string, string> = {
  IMPLEMENTATION: "Implementation",
  CONCEPT: "Concept",
  ARCHIVE: "Archive",
};

const DESTINATION_COLORS: Record<string, string> = {
  IMPLEMENTATION: "bg-emerald-100 text-emerald-700",
  CONCEPT: "bg-blue-100 text-blue-700",
  ARCHIVE: "bg-gray-100 text-gray-600",
};

export function ShortlistPanel({
  sessionId,
  selectedIdeaIds,
  onClearSelection,
}: ShortlistPanelProps) {
  const utils = trpc.useUtils();

  const shortlistQuery = trpc.evaluation.shortlistGet.useQuery({ sessionId });

  const addIdeasMutation = trpc.evaluation.shortlistAddIdeas.useMutation({
    onSuccess: () => {
      utils.evaluation.shortlistGet.invalidate({ sessionId });
      onClearSelection();
    },
  });

  const removeIdeaMutation = trpc.evaluation.shortlistRemoveIdea.useMutation({
    onSuccess: () => {
      utils.evaluation.shortlistGet.invalidate({ sessionId });
    },
  });

  const lockMutation = trpc.evaluation.shortlistLock.useMutation({
    onSuccess: () => {
      utils.evaluation.shortlistGet.invalidate({ sessionId });
    },
  });

  const forwardMutation = trpc.evaluation.shortlistForward.useMutation({
    onSuccess: () => {
      utils.evaluation.shortlistGet.invalidate({ sessionId });
    },
  });

  const handleAddSelected = React.useCallback(() => {
    if (selectedIdeaIds.size === 0) return;
    addIdeasMutation.mutate({
      sessionId,
      ideaIds: Array.from(selectedIdeaIds),
    });
  }, [sessionId, selectedIdeaIds, addIdeasMutation]);

  const handleRemove = React.useCallback(
    (ideaId: string) => {
      removeIdeaMutation.mutate({ sessionId, ideaId });
    },
    [sessionId, removeIdeaMutation],
  );

  const handleLock = React.useCallback(() => {
    if (!window.confirm("Lock this shortlist? This prevents further modifications.")) return;
    lockMutation.mutate({ sessionId });
  }, [sessionId, lockMutation]);

  const handleForward = React.useCallback(
    (ideaId: string, destination: "IMPLEMENTATION" | "CONCEPT" | "ARCHIVE") => {
      forwardMutation.mutate({ sessionId, ideaId, destination });
    },
    [sessionId, forwardMutation],
  );

  if (shortlistQuery.isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  const shortlist = shortlistQuery.data;
  const isLocked = shortlist?.isLocked ?? false;
  const entries = shortlist?.entries ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Shortlist</h3>
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {entries.length} idea{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {selectedIdeaIds.size > 0 && !isLocked && (
        <div className="mt-3">
          <Button
            size="sm"
            onClick={handleAddSelected}
            disabled={addIdeasMutation.isPending}
            className="w-full"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add {selectedIdeaIds.size} Selected to Shortlist
          </Button>
        </div>
      )}

      {entries.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {entries.map((entry) => (
            <li key={entry.ideaId} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{entry.ideaTitle}</p>
                  {entry.ideaTeaser && (
                    <p className="truncate text-xs text-gray-400">{entry.ideaTeaser}</p>
                  )}
                  {entry.forwardedTo && (
                    <span
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        DESTINATION_COLORS[entry.forwardedTo] ?? "bg-gray-100 text-gray-600",
                      )}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {DESTINATION_LABELS[entry.forwardedTo] ?? entry.forwardedTo}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!entry.forwardedTo && (
                    <ForwardDropdown
                      onForward={(dest) => handleForward(entry.ideaId, dest)}
                      disabled={forwardMutation.isPending}
                    />
                  )}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.ideaId)}
                      disabled={removeIdeaMutation.isPending}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove from shortlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-center text-xs text-gray-400">
          Select ideas from the results table and add them to the shortlist.
        </p>
      )}

      {entries.length > 0 && !isLocked && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLock}
            disabled={lockMutation.isPending}
            className="w-full"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Lock Shortlist
          </Button>
        </div>
      )}
    </div>
  );
}

function ForwardDropdown({
  onForward,
  disabled,
}: {
  onForward: (dest: "IMPLEMENTATION" | "CONCEPT" | "ARCHIVE") => void;
  disabled: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const currentRef = ref.current;
    function handleClickOutside(event: MouseEvent) {
      if (currentRef && !currentRef.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Forward idea"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {(["IMPLEMENTATION", "CONCEPT", "ARCHIVE"] as const).map((dest) => (
            <button
              key={dest}
              type="button"
              onClick={() => {
                onForward(dest);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
            >
              {DESTINATION_LABELS[dest]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
