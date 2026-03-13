"use client";

import * as React from "react";
import { Loader2, Brain, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

interface AiScoreCardProps {
  ideaId: string;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{Math.round(score)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function ConfidenceMeter({ level }: { level: number }) {
  const percentage = Math.round(level * 100);
  let variant: "default" | "success" | "warning" | "destructive" = "default";
  if (percentage >= 70) variant = "success";
  else if (percentage >= 40) variant = "warning";
  else variant = "destructive";

  return (
    <Tooltip content="AI confidence in the accuracy of this score">
      <Badge variant={variant}>{percentage}% confidence</Badge>
    </Tooltip>
  );
}

export function AiScoreCard({ ideaId }: AiScoreCardProps) {
  const scoreQuery = trpc.aiInsights.getScore.useQuery({ ideaId });
  const scoreMutation = trpc.aiInsights.scoreIdea.useMutation({
    onSuccess: () => {
      scoreQuery.refetch();
    },
  });

  const score = scoreQuery.data;
  const isLoading = scoreQuery.isLoading || scoreMutation.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-primary-600" />
          AI Predictive Score
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scoreMutation.mutate({ ideaId })}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1">{score ? "Re-score" : "Score"}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && !score ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : score ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary-600">
                {Math.round(score.overallScore)}
              </div>
              <ConfidenceMeter level={score.confidenceLevel} />
            </div>

            <div className="space-y-3">
              <ScoreBar label="Feasibility" score={score.feasibilityScore} color="bg-blue-500" />
              <ScoreBar label="Impact" score={score.impactScore} color="bg-green-500" />
              <ScoreBar label="Alignment" score={score.alignmentScore} color="bg-purple-500" />
            </div>

            <p className="text-xs text-gray-500">{score.reasoning}</p>
            <p className="text-xs text-gray-400">
              Scored {new Date(score.scoredAt).toLocaleDateString()} &middot; {score.modelVersion}
            </p>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-gray-500">
            No AI score yet. Click &quot;Score&quot; to generate one.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
