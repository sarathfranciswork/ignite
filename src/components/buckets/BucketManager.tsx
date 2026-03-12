"use client";

import * as React from "react";
import { BucketSidebar } from "./BucketSidebar";
import { BucketIdeasView } from "./BucketIdeasView";
import { CreateBucketDialog } from "./CreateBucketDialog";

interface BucketManagerProps {
  campaignId: string;
}

export function BucketManager({ campaignId }: BucketManagerProps) {
  const [selectedBucketId, setSelectedBucketId] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <BucketSidebar
          campaignId={campaignId}
          selectedBucketId={selectedBucketId}
          onSelectBucket={setSelectedBucketId}
          onCreateBucket={() => setIsCreateOpen(true)}
        />
      </div>

      <div className="min-w-0 flex-1">
        {selectedBucketId ? (
          <BucketIdeasView bucketId={selectedBucketId} campaignId={campaignId} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900">Bucket Management</h3>
            <p className="mt-2 text-sm text-gray-500">
              Select a bucket from the sidebar to view its ideas, or create a new bucket to organize
              ideas.
            </p>
          </div>
        )}
      </div>

      <CreateBucketDialog
        campaignId={campaignId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
