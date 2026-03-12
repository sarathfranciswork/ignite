"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightFormDialog } from "@/components/insights/InsightFormDialog";
import {
  Lightbulb,
  ArrowLeft,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS: Record<string, string> = {
  SIGNAL: "bg-blue-100 text-blue-700",
  OBSERVATION: "bg-green-100 text-green-700",
  OPPORTUNITY: "bg-purple-100 text-purple-700",
  RISK: "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  SIGNAL: "Signal",
  OBSERVATION: "Observation",
  OPPORTUNITY: "Opportunity",
  RISK: "Risk",
};

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "Global",
  CAMPAIGN: "Campaign",
  TREND: "Trend",
};

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const insightQuery = trpc.insight.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const updateMutation = trpc.insight.update.useMutation({
    onSuccess: () => {
      toast.success("Insight updated");
      setShowEditDialog(false);
      utils.insight.getById.invalidate({ id });
      utils.insight.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const archiveMutation = trpc.insight.archive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isArchived ? "Insight archived" : "Insight restored");
      utils.insight.getById.invalidate({ id });
      utils.insight.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.insight.delete.useMutation({
    onSuccess: () => {
      toast.success("Insight deleted");
      router.push("/strategy/insights");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlinkTrendMutation = trpc.insight.unlinkTrend.useMutation({
    onSuccess: () => {
      toast.success("Trend unlinked");
      utils.insight.getById.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (insightQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (insightQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load insight.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/strategy/insights")}
        >
          Back to list
        </Button>
      </div>
    );
  }

  const insight = insightQuery.data;
  if (!insight) return null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/strategy/insights")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Insights
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-1 h-7 w-7 shrink-0 text-primary-600" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-gray-900">{insight.title}</h1>
              <Badge className={TYPE_COLORS[insight.type] ?? ""}>
                {TYPE_LABELS[insight.type] ?? insight.type}
              </Badge>
              {insight.isArchived && <Badge variant="secondary">Archived</Badge>}
              {insight.isEditorial && (
                <Badge variant="outline" className="text-amber-600">
                  Editorial
                </Badge>
              )}
            </div>
            {insight.description && (
              <p className="mt-2 max-w-2xl text-sm text-gray-500">{insight.description}</p>
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
            {insight.isArchived ? (
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
            <TrendingUp className="h-8 w-8 text-indigo-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{insight.trendCount}</p>
              <p className="text-sm text-gray-500">Linked Trends</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Lightbulb className="h-8 w-8 text-primary-500" />
            <div>
              <p className="text-lg font-bold text-gray-900">
                {SCOPE_LABELS[insight.scope] ?? insight.scope}
              </p>
              <p className="text-sm text-gray-500">Scope</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="text-sm text-gray-500">
              <p>
                Created{" "}
                {new Date(insight.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              {insight.createdBy.name && (
                <p className="mt-0.5 text-xs text-gray-400">by {insight.createdBy.name}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source URL */}
      {insight.sourceUrl && (
        <Card>
          <CardContent className="p-4">
            <a
              href={insight.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary-600 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {insight.sourceUrl}
            </a>
          </CardContent>
        </Card>
      )}

      {/* Linked Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Linked Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insight.trends.length === 0 ? (
            <p className="text-sm text-gray-500">No trends linked to this insight yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {insight.trends.map((trend) => (
                <div key={trend.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/strategy/trends/${trend.id}`)}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {trend.title}
                    </button>
                    <Badge variant="outline" className="text-xs">
                      {trend.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkTrendMutation.mutate({ insightId: id, trendId: trend.id })}
                    disabled={unlinkTrendMutation.isPending}
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
        <InsightFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(data) =>
            updateMutation.mutate({
              id,
              title: data.title,
              description: data.description || null,
              type: data.type,
              scope: data.scope,
              sourceUrl: data.sourceUrl || null,
            })
          }
          isLoading={updateMutation.isPending}
          initialData={insight}
          mode="edit"
        />
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h3 className="font-display text-lg font-semibold">Delete Insight</h3>
            <p className="mt-2 text-sm text-gray-500">
              Are you sure you want to delete &quot;{insight.title}&quot;? This action cannot be
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
