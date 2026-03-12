"use client";

import * as React from "react";
import { Lock, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ShortlistItem {
  id: string;
  ideaId: string;
  ideaTitle: string;
  ideaTeaser: string | null;
  ideaStatus: string;
  addedById: string;
  addedAt: string;
  forwardedTo: string | null;
  forwardedAt: string | null;
}

interface ShortlistPanelProps {
  sessionId: string;
  isLocked: boolean;
  items: ShortlistItem[];
  onRefresh: () => void;
}

type ForwardTarget = "SELECTED_IMPLEMENTATION" | "CONCEPT" | "ARCHIVED";

const FORWARD_LABELS: Record<ForwardTarget, string> = {
  SELECTED_IMPLEMENTATION: "Implementation",
  CONCEPT: "Concept",
  ARCHIVED: "Archive",
};

export function ShortlistPanel({ sessionId, isLocked, items, onRefresh }: ShortlistPanelProps) {
  const [forwardTarget, setForwardTarget] =
    React.useState<ForwardTarget>("SELECTED_IMPLEMENTATION");

  const utils = trpc.useUtils();

  const lockMutation = trpc.evaluation.shortlistLock.useMutation({
    onSuccess: () => {
      onRefresh();
      void utils.evaluation.shortlistGet.invalidate({ sessionId });
      void utils.evaluation.enhancedResults.invalidate({ sessionId });
    },
  });

  const removeMutation = trpc.evaluation.shortlistRemove.useMutation({
    onSuccess: () => {
      onRefresh();
      void utils.evaluation.enhancedResults.invalidate({ sessionId });
    },
  });

  const forwardMutation = trpc.evaluation.shortlistForward.useMutation({
    onSuccess: () => {
      onRefresh();
      void utils.evaluation.enhancedResults.invalidate({ sessionId });
    },
  });

  const forwardAllMutation = trpc.evaluation.shortlistForwardAll.useMutation({
    onSuccess: () => {
      onRefresh();
      void utils.evaluation.enhancedResults.invalidate({ sessionId });
    },
  });

  const unforwardedItems = items.filter((item) => !item.forwardedTo);
  const forwardedItems = items.filter((item) => item.forwardedTo);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900">
          Shortlist ({items.length} idea{items.length !== 1 ? "s" : ""})
        </h3>
        <div className="flex items-center gap-2">
          {isLocked ? (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <Lock className="h-4 w-4" />
              Locked
            </span>
          ) : (
            <button
              type="button"
              onClick={() => lockMutation.mutate({ sessionId })}
              disabled={lockMutation.isPending || items.length === 0}
              className="flex items-center gap-1 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lockMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              Lock Shortlist
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          No ideas shortlisted yet. Use the star icons in the results table to add ideas.
        </div>
      ) : (
        <div>
          {/* Unforwarded items */}
          {unforwardedItems.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {unforwardedItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.ideaTitle}</p>
                    {item.ideaTeaser && (
                      <p className="truncate text-xs text-gray-500">{item.ideaTeaser}</p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {isLocked && (
                      <button
                        type="button"
                        onClick={() =>
                          forwardMutation.mutate({
                            sessionId,
                            ideaId: item.ideaId,
                            target: forwardTarget,
                          })
                        }
                        disabled={forwardMutation.isPending}
                        className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
                        title={`Forward to ${FORWARD_LABELS[forwardTarget]}`}
                      >
                        <ArrowRight className="h-3 w-3" />
                        {FORWARD_LABELS[forwardTarget]}
                      </button>
                    )}
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate({ sessionId, ideaId: item.ideaId })}
                        disabled={removeMutation.isPending}
                        className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        title="Remove from shortlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Forwarded items */}
          {forwardedItems.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50">
              <p className="px-4 py-2 text-xs font-medium text-gray-500">Forwarded</p>
              <ul className="divide-y divide-gray-100">
                {forwardedItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-4 py-2">
                    <p className="truncate text-sm text-gray-600">{item.ideaTitle}</p>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {FORWARD_LABELS[item.forwardedTo as ForwardTarget] ?? item.forwardedTo}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bulk actions when locked */}
          {isLocked && unforwardedItems.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <label htmlFor="forward-target" className="text-sm text-gray-600">
                  Forward all to:
                </label>
                <select
                  id="forward-target"
                  value={forwardTarget}
                  onChange={(e) => setForwardTarget(e.target.value as ForwardTarget)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="SELECTED_IMPLEMENTATION">Implementation</option>
                  <option value="CONCEPT">Concept</option>
                  <option value="ARCHIVED">Archive</option>
                </select>
                <button
                  type="button"
                  onClick={() => forwardAllMutation.mutate({ sessionId, target: forwardTarget })}
                  disabled={forwardAllMutation.isPending}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {forwardAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Forward All ({unforwardedItems.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
