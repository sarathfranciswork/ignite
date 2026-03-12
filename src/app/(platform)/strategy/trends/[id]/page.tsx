"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendFormDialog } from "@/components/trends/TrendFormDialog";
import {
  TrendingUp,
  ArrowLeft,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Target,
  Lightbulb,
  Lock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  MEGA: "bg-purple-100 text-purple-700",
  MACRO: "bg-blue-100 text-blue-700",
  MICRO: "bg-green-100 text-green-700",
};

export default function TrendDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const trendQuery = trpc.trend.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const updateMutation = trpc.trend.update.useMutation({
    onSuccess: () => {
      toast.success("Trend updated");
      setShowEditDialog(false);
      utils.trend.getById.invalidate({ id });
      utils.trend.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveMutation = trpc.trend.archive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isArchived ? "Trend archived" : "Trend restored");
      utils.trend.getById.invalidate({ id });
      utils.trend.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.trend.delete.useMutation({
    onSuccess: () => {
      toast.success("Trend deleted");
      router.push("/strategy/trends");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlinkSiaMutation = trpc.trend.unlinkSia.useMutation({
    onSuccess: () => {
      toast.success("SIA unlinked");
      utils.trend.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (trendQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (trendQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load trend.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/strategy/trends")}>
          Back to list
        </Button>
      </div>
    );
  }

  const trend = trendQuery.data;
  if (!trend) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/strategy/trends")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Trends
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="mt-1 h-7 w-7 shrink-0 text-primary-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">{trend.title}</h1>
              <Badge className={TYPE_COLORS[trend.type] ?? ""}>{trend.type}</Badge>
              {trend.isArchived && <Badge variant="secondary">Archived</Badge>}
              {trend.isConfidential && (
                <Badge variant="outline" className="text-amber-600">
                  <Lock className="mr-1 h-3 w-3" />
                  Confidential
                </Badge>
              )}
            </div>
            {trend.description && (
              <p className="mt-1 max-w-2xl text-sm text-gray-500">{trend.description}</p>
            )}
            {trend.parent && (
              <p className="mt-1 text-xs text-gray-400">
                Parent:{" "}
                <button
                  onClick={() => router.push(`/strategy/trends/${trend.parent?.id}`)}
                  className="text-primary-600 hover:underline"
                >
                  {trend.parent.title}
                </button>
              </p>
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
            {trend.isArchived ? (
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
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-primary-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{trend.childCount}</p>
              <p className="text-sm text-gray-500">Sub-trends</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{trend.siaCount}</p>
              <p className="text-sm text-gray-500">Linked SIAs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Lightbulb className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{trend.insightCount}</p>
              <p className="text-sm text-gray-500">Insights</p>
            </div>
          </CardContent>
        </Card>
        {trend.businessRelevance !== null && (
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                {trend.businessRelevance.toFixed(1)}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">/ 10</p>
                <p className="text-sm text-gray-500">Relevance</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Source URL */}
      {trend.sourceUrl && (
        <Card>
          <CardContent className="p-4">
            <a
              href={trend.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {trend.sourceUrl}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Sub-trends */}
      {trend.children.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sub-trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {trend.children.map((child) => (
                <div key={child.id} className="flex items-center justify-between py-3">
                  <div>
                    <button
                      onClick={() => router.push(`/strategy/trends/${child.id}`)}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {child.title}
                    </button>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge className={TYPE_COLORS[child.type] ?? ""} variant="secondary">
                        {child.type}
                      </Badge>
                      {child.isArchived && (
                        <Badge variant="secondary" className="text-xs">
                          Archived
                        </Badge>
                      )}
                    </div>
                  </div>
                  {child.businessRelevance !== null && (
                    <span className="text-sm text-gray-400">
                      Relevance: {child.businessRelevance.toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
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
          {trend.sias.length === 0 ? (
            <p className="text-sm text-gray-500">No SIAs linked to this trend yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {trend.sias.map((sia) => (
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
                    onClick={() => unlinkSiaMutation.mutate({ trendId: id, siaId: sia.id })}
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

      {/* Insights */}
      {trend.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Related Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {trend.insights.map((insight) => (
                <div key={insight.id} className="py-3">
                  <p className="font-medium text-gray-900">{insight.title}</p>
                  {insight.sourceUrl && (
                    <a
                      href={insight.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit dialog */}
      {showEditDialog && (
        <TrendFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(data) =>
            updateMutation.mutate({
              id,
              title: data.title,
              description: data.description || null,
              type: data.type,
              sourceUrl: data.sourceUrl || null,
              isConfidential: data.isConfidential,
              businessRelevance: data.businessRelevance,
            })
          }
          isLoading={updateMutation.isPending}
          initialData={trend}
          mode="edit"
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold">Delete Trend</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete &quot;{trend.title}&quot;?{" "}
              {trend.childCount > 0 && "This trend has sub-trends that must be removed first. "}
              This action cannot be undone.
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
