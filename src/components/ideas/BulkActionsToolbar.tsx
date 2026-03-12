"use client";

import * as React from "react";
import { Archive, FolderInput, Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

interface BulkActionsToolbarProps {
  selectedIds: Set<string>;
  campaignId: string;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionsToolbar({
  selectedIds,
  campaignId,
  onClearSelection,
  onActionComplete,
}: BulkActionsToolbarProps) {
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [showBucketDialog, setShowBucketDialog] = React.useState(false);
  const [archiveReason, setArchiveReason] = React.useState("");

  const utils = trpc.useUtils();

  const bucketsQuery = trpc.bucket.list.useQuery(
    { campaignId, limit: 50 },
    { enabled: showBucketDialog },
  );

  const bulkArchiveMutation = trpc.idea.bulkArchive.useMutation({
    onSuccess: () => {
      setShowArchiveDialog(false);
      setArchiveReason("");
      onClearSelection();
      onActionComplete();
      void utils.idea.listForBoard.invalidate();
      void utils.idea.list.invalidate();
    },
  });

  const bulkAssignBucketMutation = trpc.idea.bulkAssignBucket.useMutation({
    onSuccess: () => {
      setShowBucketDialog(false);
      onClearSelection();
      onActionComplete();
      void utils.bucket.listIdeas.invalidate();
    },
  });

  const bulkExportMutation = trpc.idea.bulkExport.useMutation({
    onSuccess: (data) => {
      const csvRows = [
        [
          "ID",
          "Title",
          "Status",
          "Category",
          "Tags",
          "Contributor",
          "Likes",
          "Comments",
          "Views",
          "Created",
        ].join(","),
        ...data.ideas.map((idea) =>
          [
            idea.id,
            `"${idea.title.replace(/"/g, '""')}"`,
            idea.status,
            idea.category ?? "",
            `"${idea.tags.join("; ")}"`,
            idea.contributorName ?? idea.contributorEmail,
            idea.likesCount,
            idea.commentsCount,
            idea.viewsCount,
            idea.createdAt,
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ideas-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      onClearSelection();
    },
  });

  const ideaIds = [...selectedIds];
  const count = selectedIds.size;

  function handleArchive() {
    if (!archiveReason.trim()) return;
    bulkArchiveMutation.mutate({ ideaIds, reason: archiveReason });
  }

  function handleAssignBucket(bucketId: string) {
    bulkAssignBucketMutation.mutate({ ideaIds, bucketId });
  }

  function handleExport() {
    bulkExportMutation.mutate({ ideaIds, campaignId });
  }

  if (count === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg bg-primary-50 px-4 py-2.5 text-sm">
        <span className="font-medium text-primary-700">
          {count} idea{count === 1 ? "" : "s"} selected
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setShowBucketDialog(true)}>
            <FolderInput className="mr-1.5 h-3.5 w-3.5" />
            Assign Bucket
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowArchiveDialog(true)}>
            <Archive className="mr-1.5 h-3.5 w-3.5" />
            Archive
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={bulkExportMutation.isPending}
          >
            {bulkExportMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Export
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearSelection} className="ml-auto">
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      {/* Archive dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Archive {count} Idea{count === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please provide a reason for archiving the selected ideas.
            </p>
            <Input
              placeholder="Archive reason..."
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowArchiveDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleArchive}
                disabled={!archiveReason.trim() || bulkArchiveMutation.isPending}
              >
                {bulkArchiveMutation.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Archive
              </Button>
            </div>
            {bulkArchiveMutation.isError && (
              <p className="text-sm text-red-600">{bulkArchiveMutation.error.message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign bucket dialog */}
      <Dialog open={showBucketDialog} onOpenChange={setShowBucketDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to Bucket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select a bucket to assign {count} idea{count === 1 ? "" : "s"} to.
            </p>
            {bucketsQuery.isLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {bucketsQuery.data && (
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {(
                  bucketsQuery.data as { items: Array<{ id: string; name: string; color: string }> }
                ).items.map((bucket) => (
                  <button
                    key={bucket.id}
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => handleAssignBucket(bucket.id)}
                    disabled={bulkAssignBucketMutation.isPending}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: bucket.color }}
                    />
                    {bucket.name}
                  </button>
                ))}
                {(bucketsQuery.data as { items: Array<{ id: string }> }).items.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    No buckets available. Create a bucket first.
                  </p>
                )}
              </div>
            )}
            {bulkAssignBucketMutation.isError && (
              <p className="text-sm text-red-600">{bulkAssignBucketMutation.error.message}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
