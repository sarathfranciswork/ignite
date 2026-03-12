"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiaFormDialog } from "@/components/sias/SiaFormDialog";
import { Target, ArrowLeft, Pencil, Trash2, Megaphone, Archive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function SiaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const siaQuery = trpc.sia.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const updateMutation = trpc.sia.update.useMutation({
    onSuccess: () => {
      toast.success("Innovation Area updated");
      setShowEditDialog(false);
      utils.sia.getById.invalidate({ id });
      utils.sia.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.sia.delete.useMutation({
    onSuccess: () => {
      toast.success("Innovation Area deleted");
      router.push("/strategy/sias");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = trpc.sia.update.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "Innovation Area activated" : "Innovation Area archived");
      utils.sia.getById.invalidate({ id });
      utils.sia.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlinkMutation = trpc.sia.unlinkCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign unlinked");
      utils.sia.getById.invalidate({ id });
      utils.sia.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (siaQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (siaQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load Innovation Area.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/strategy/sias")}>
          Back to list
        </Button>
      </div>
    );
  }

  const sia = siaQuery.data;

  if (!sia) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/strategy/sias")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Innovation Areas
      </button>

      {/* Header with color banner */}
      {sia.color && <div className="h-3 rounded-t-xl" style={{ backgroundColor: sia.color }} />}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Target className="mt-1 h-7 w-7 shrink-0" style={{ color: sia.color ?? "#6366F1" }} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">{sia.name}</h1>
              <Badge variant={sia.isActive ? "success" : "secondary"}>
                {sia.isActive ? "Active" : "Archived"}
              </Badge>
            </div>
            {sia.description && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{sia.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleActiveMutation.mutate({ id, isActive: !sia.isActive })}
            disabled={toggleActiveMutation.isPending}
          >
            {sia.isActive ? (
              <>
                <Archive className="mr-1 h-3.5 w-3.5" />
                Archive
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Activate
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Megaphone className="h-8 w-8 text-primary-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{sia.campaignCount}</p>
              <p className="text-sm text-gray-500">Linked Campaigns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sia.campaigns.length === 0 ? (
            <p className="text-sm text-gray-500">
              No campaigns linked to this Innovation Area yet.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sia.campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between py-3">
                  <div>
                    <button
                      onClick={() => router.push(`/campaigns/${campaign.id}`)}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {campaign.title}
                    </button>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                      <Badge variant="secondary" className="text-xs">
                        {campaign.status}
                      </Badge>
                      <span>{campaign.ideaCount} ideas</span>
                      <span>{campaign.memberCount} members</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkMutation.mutate({ campaignId: campaign.id })}
                    disabled={unlinkMutation.isPending}
                    className="text-gray-400 hover:text-red-600"
                  >
                    Unlink
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {showEditDialog && (
        <SiaFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(data) =>
            updateMutation.mutate({
              id,
              name: data.name,
              description: data.description || null,
              color: data.color,
            })
          }
          isLoading={updateMutation.isPending}
          initialData={sia}
          mode="edit"
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold">Delete Innovation Area</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete &quot;{sia.name}&quot;? All campaign links will be
              removed. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate({ id })}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
