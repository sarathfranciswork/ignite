"use client";

import * as React from "react";
import { Loader2, Sparkles, ExternalLink, X, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function RelevanceScore({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  let variant: "success" | "warning" | "secondary" = "secondary";
  if (percentage >= 70) variant = "success";
  else if (percentage >= 40) variant = "warning";

  return <Badge variant={variant}>{percentage}% relevant</Badge>;
}

interface RecommendationCardProps {
  recommendation: {
    id: string;
    title: string;
    description: string;
    relevanceScore: number;
    reasoning: string;
    source: string;
    organizationId: string | null;
    createdAt: string;
  };
  onDismiss: (id: string) => void;
  isDismissing: boolean;
}

function RecommendationCard({ recommendation, onDismiss, isDismissing }: RecommendationCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{recommendation.title}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <RelevanceScore score={recommendation.relevanceScore} />
              <span className="text-xs text-gray-400">
                {new Date(recommendation.createdAt).toLocaleDateString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {recommendation.organizationId && (
              <Badge variant="accent">
                <Link2 className="mr-1 h-3 w-3" />
                Linked
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
              onClick={() => onDismiss(recommendation.id)}
              disabled={isDismissing}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-sm text-gray-700">{recommendation.description}</p>
        <p className="text-xs text-gray-500">
          <span className="font-medium">Why:</span> {recommendation.reasoning}
        </p>
        <p className="mt-1 text-xs text-gray-400">Source: {recommendation.source}</p>
      </CardContent>
    </Card>
  );
}

export default function ScoutingRecommendationsPage() {
  const [selectedSiaId, setSelectedSiaId] = React.useState<string>("");

  const siasQuery = trpc.sia.list.useQuery({
    limit: 50,
  });

  const recommendationsQuery = trpc.aiInsights.getRecommendations.useQuery(
    { siaId: selectedSiaId, limit: 20 },
    { enabled: selectedSiaId.length > 0 },
  );

  const generateMutation = trpc.aiInsights.generateRecommendations.useMutation({
    onSuccess: () => {
      recommendationsQuery.refetch();
    },
  });

  const dismissMutation = trpc.aiInsights.dismissRecommendation.useMutation({
    onSuccess: () => {
      recommendationsQuery.refetch();
    },
  });

  const sias = React.useMemo(() => siasQuery.data?.items ?? [], [siasQuery.data?.items]);
  const recommendations = recommendationsQuery.data?.items ?? [];

  React.useEffect(() => {
    if (sias.length > 0 && !selectedSiaId) {
      setSelectedSiaId(sias[0].id);
    }
  }, [sias, selectedSiaId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Scouting Recommendations
          </h1>
          <p className="text-sm text-gray-500">
            AI-powered recommendations for startup and technology scouting
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={selectedSiaId}
          onChange={(e) => setSelectedSiaId(e.target.value)}
        >
          {sias.map((sia) => (
            <option key={sia.id} value={sia.id}>
              {sia.name}
            </option>
          ))}
        </select>

        <Button
          onClick={() => {
            if (selectedSiaId) {
              generateMutation.mutate({ siaId: selectedSiaId });
            }
          }}
          disabled={!selectedSiaId || generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Recommendations
        </Button>
      </div>

      {!selectedSiaId ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <ExternalLink className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p>Select a Strategic Innovation Area to view recommendations.</p>
          </CardContent>
        </Card>
      ) : recommendationsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onDismiss={(id) => dismissMutation.mutate({ id })}
              isDismissing={dismissMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p>No recommendations yet. Click &quot;Generate&quot; to get AI-powered suggestions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
