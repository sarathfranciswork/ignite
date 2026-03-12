"use client";

import * as React from "react";
import { FolderPlus, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

interface AssignToBucketMenuProps {
  ideaId: string;
  campaignId: string;
}

export function AssignToBucketMenu({ ideaId, campaignId }: AssignToBucketMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const bucketsQuery = trpc.bucket.list.useQuery(
    { campaignId, type: "MANUAL", limit: 50 },
    { enabled: isOpen },
  );

  const assignMutation = trpc.bucket.assignIdea.useMutation({
    onSuccess: () => {
      void utils.bucket.sidebar.invalidate({ campaignId });
      void utils.bucket.listIdeas.invalidate();
    },
  });

  const unassignMutation = trpc.bucket.unassignIdea.useMutation({
    onSuccess: () => {
      void utils.bucket.sidebar.invalidate({ campaignId });
      void utils.bucket.listIdeas.invalidate();
    },
  });

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const buckets = bucketsQuery.data?.items ?? [];

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="h-8 w-8 p-0"
        title="Assign to bucket"
      >
        <FolderPlus className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-500">Assign to bucket</p>
          {bucketsQuery.isLoading && <p className="px-3 py-2 text-xs text-gray-400">Loading...</p>}
          {buckets.length === 0 && !bucketsQuery.isLoading && (
            <p className="px-3 py-2 text-xs text-gray-400">No manual buckets</p>
          )}
          {buckets.map((bucket) => {
            const isAssigned = false; // We check reactively on click
            return (
              <button
                key={bucket.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  assignMutation.mutate(
                    { bucketId: bucket.id, ideaId },
                    {
                      onError: (err) => {
                        if (err.message.includes("Unique constraint")) {
                          unassignMutation.mutate({ bucketId: bucket.id, ideaId });
                        }
                      },
                    },
                  );
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
                <span className="truncate">{bucket.name}</span>
                {isAssigned && <Check className="ml-auto h-4 w-4 text-green-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
