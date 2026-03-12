"use client";

import * as React from "react";
import { trpc } from "@/lib/trpc";
import { X, Plus, Compass } from "lucide-react";

interface CampaignSiaManagerProps {
  campaignId: string;
}

export function CampaignSiaManager({ campaignId }: CampaignSiaManagerProps) {
  const [isAdding, setIsAdding] = React.useState(false);
  const [selectedSiaId, setSelectedSiaId] = React.useState("");
  const utils = trpc.useUtils();

  const linkedSiasQuery = trpc.campaign.getLinkedSias.useQuery(
    { campaignId },
    { enabled: !!campaignId },
  );

  const allSiasQuery = trpc.sia.list.useQuery(
    { isActive: true, limit: 100, sortBy: "name", sortDirection: "asc" },
    { enabled: isAdding },
  );

  const linkMutation = trpc.campaign.linkSias.useMutation({
    onSuccess: () => {
      void utils.campaign.getLinkedSias.invalidate({ campaignId });
      void utils.campaign.getById.invalidate({ id: campaignId });
      void utils.campaign.getBeInspired.invalidate({ campaignId });
      setIsAdding(false);
      setSelectedSiaId("");
    },
  });

  const unlinkMutation = trpc.campaign.unlinkSia.useMutation({
    onSuccess: () => {
      void utils.campaign.getLinkedSias.invalidate({ campaignId });
      void utils.campaign.getById.invalidate({ id: campaignId });
      void utils.campaign.getBeInspired.invalidate({ campaignId });
    },
  });

  const linkedSias = linkedSiasQuery.data ?? [];
  const linkedSiaIds = new Set(linkedSias.map((s) => s.id));

  const availableSias = (allSiasQuery.data?.items ?? []).filter((sia) => !linkedSiaIds.has(sia.id));

  function handleLink() {
    if (!selectedSiaId) return;
    linkMutation.mutate({ campaignId, siaIds: [selectedSiaId] });
  }

  function handleUnlink(siaId: string) {
    unlinkMutation.mutate({ campaignId, siaId });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Compass className="h-4 w-4 text-primary-600" />
          Strategic Alignment
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Link SIA
          </button>
        )}
      </div>

      {linkedSias.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedSias.map((sia) => (
            <span
              key={sia.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {sia.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: sia.color }}
                />
              )}
              {sia.name}
              <button
                onClick={() => handleUnlink(sia.id)}
                className="ml-0.5 text-gray-400 hover:text-gray-600"
                disabled={unlinkMutation.isPending}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {linkedSias.length === 0 && !isAdding && (
        <p className="mt-2 text-xs text-gray-500">
          No SIAs linked. Link one to enable the Be Inspired tab.
        </p>
      )}

      {isAdding && (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={selectedSiaId}
            onChange={(e) => setSelectedSiaId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select an SIA...</option>
            {availableSias.map((sia) => (
              <option key={sia.id} value={sia.id}>
                {sia.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLink}
            disabled={!selectedSiaId || linkMutation.isPending}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Link
          </button>
          <button
            onClick={() => {
              setIsAdding(false);
              setSelectedSiaId("");
            }}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
