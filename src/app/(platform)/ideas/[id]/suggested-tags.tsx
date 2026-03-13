"use client";

import * as React from "react";
import { Loader2, Tag, Check, X, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface SuggestedTagsProps {
  ideaId: string;
}

export function SuggestedTags({ ideaId }: SuggestedTagsProps) {
  const tagsQuery = trpc.aiInsights.getSuggestedTags.useQuery({ ideaId });
  const categorizeMutation = trpc.aiInsights.categorize.useMutation({
    onSuccess: () => {
      tagsQuery.refetch();
    },
  });
  const acceptMutation = trpc.aiInsights.acceptTag.useMutation({
    onSuccess: () => {
      tagsQuery.refetch();
    },
  });
  const rejectMutation = trpc.aiInsights.rejectTag.useMutation({
    onSuccess: () => {
      tagsQuery.refetch();
    },
  });

  const tags = tagsQuery.data ?? [];
  const pendingTags = tags.filter((t) => t.isAccepted === null);
  const isLoading = tagsQuery.isLoading || categorizeMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4 text-accent-600" />
          AI Suggested Tags
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => categorizeMutation.mutate({ ideaId })}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="ml-1">Suggest</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && tags.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : pendingTags.length > 0 ? (
          <div className="space-y-2">
            {pendingTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{tag.tag}</Badge>
                  <span className="text-xs text-gray-400">{Math.round(tag.confidence * 100)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={() => acceptMutation.mutate({ autoTagId: tag.id })}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => rejectMutation.mutate({ autoTagId: tag.id })}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : tags.length > 0 ? (
          <p className="py-2 text-center text-sm text-gray-500">
            All suggested tags have been reviewed.
          </p>
        ) : (
          <p className="py-4 text-center text-sm text-gray-500">
            No AI suggestions yet. Click &quot;Suggest&quot; to generate tags.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
