"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TechnologyFormDialog } from "@/components/technologies/TechnologyFormDialog";
import {
  Cpu,
  ArrowLeft,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Target,
  Lock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const MATURITY_COLORS: Record<string, string> = {
  EMERGING: "bg-cyan-100 text-cyan-700",
  GROWING: "bg-green-100 text-green-700",
  MATURE: "bg-blue-100 text-blue-700",
  DECLINING: "bg-orange-100 text-orange-700",
};

const MATURITY_LABELS: Record<string, string> = {
  EMERGING: "Emerging",
  GROWING: "Growing",
  MATURE: "Mature",
  DECLINING: "Declining",
};

export default function TechnologyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const techQuery = trpc.technology.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const updateMutation = trpc.technology.update.useMutation({
    onSuccess: () => {
      toast.success("Technology updated");
      setShowEditDialog(false);
      utils.technology.getById.invalidate({ id });
      utils.technology.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveMutation = trpc.technology.archive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isArchived ? "Technology archived" : "Technology restored");
      utils.technology.getById.invalidate({ id });
      utils.technology.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.technology.delete.useMutation({
    onSuccess: () => {
      toast.success("Technology deleted");
      router.push("/strategy/technologies");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlinkSiaMutation = trpc.technology.unlinkSia.useMutation({
    onSuccess: () => {
      toast.success("SIA unlinked");
      utils.technology.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (techQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (techQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load technology.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/strategy/technologies")}
        >
          Back to list
        </Button>
      </div>
    );
  }

  const tech = techQuery.data;
  if (!tech) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/strategy/technologies")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Technologies
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Cpu className="mt-1 h-7 w-7 shrink-0 text-primary-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">{tech.title}</h1>
              {tech.maturityLevel && (
                <Badge className={MATURITY_COLORS[tech.maturityLevel] ?? ""}>
                  {MATURITY_LABELS[tech.maturityLevel] ?? tech.maturityLevel}
                </Badge>
              )}
              {tech.isArchived && <Badge variant="secondary">Archived</Badge>}
              {tech.isConfidential && (
                <Badge variant="outline" className="text-amber-600">
                  <Lock className="mr-1 h-3 w-3" />
                  Confidential
                </Badge>
              )}
            </div>
            {tech.description && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{tech.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => archiveMutation.mutate({ id })}
            disabled={archiveMutation.isPending}
          >
            {tech.isArchived ? (
              <>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                Restore
              </>
            ) : (
              <>
                <Archive className="mr-1 h-3.5 w-3.5" />
                Archive
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

      {/* Metadata */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{tech.siaCount}</p>
              <p className="text-sm text-gray-500">Linked SIAs</p>
            </div>
          </CardContent>
        </Card>
        {tech.maturityLevel && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Cpu className="h-8 w-8 text-primary-500" />
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {MATURITY_LABELS[tech.maturityLevel] ?? tech.maturityLevel}
                </p>
                <p className="text-sm text-gray-500">Maturity Level</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="text-sm text-gray-500">
              <p>
                Created{" "}
                {new Date(tech.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {tech.createdBy.name && (
                <p className="mt-0.5 text-xs text-gray-400">by {tech.createdBy.name}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source URL */}
      {tech.sourceUrl && (
        <Card>
          <CardContent className="p-4">
            <a
              href={tech.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {tech.sourceUrl}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Linked SIAs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategic Innovation Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tech.sias.length === 0 ? (
            <p className="text-sm text-gray-500">No SIAs linked to this technology yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {tech.sias.map((sia) => (
                <div key={sia.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    {sia.color && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: sia.color }}
                      />
                    )}
                    <button
                      onClick={() => router.push(`/strategy/sias/${sia.id}`)}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {sia.name}
                    </button>
                    {!sia.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Archived
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkSiaMutation.mutate({ techId: id, siaId: sia.id })}
                    disabled={unlinkSiaMutation.isPending}
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
        <TechnologyFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(data) =>
            updateMutation.mutate({
              id,
              title: data.title,
              description: data.description || null,
              maturityLevel: data.maturityLevel,
              sourceUrl: data.sourceUrl || null,
              isConfidential: data.isConfidential,
            })
          }
          isLoading={updateMutation.isPending}
          initialData={tech}
          mode="edit"
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold">Delete Technology</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete &quot;{tech.title}&quot;? This action cannot be
              undone.
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
