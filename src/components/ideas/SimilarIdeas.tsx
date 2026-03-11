"use client";

import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface SimilarIdeasProps {
  ideaId: string;
}

export function SimilarIdeas({ ideaId }: SimilarIdeasProps) {
  const aiStatus = trpc.ai.status.useQuery(undefined, {
    staleTime: 60_000,
  });

  const similarQuery = trpc.ai.findSimilar.useQuery(
    { ideaId, limit: 5 },
    {
      enabled: !!ideaId,
      staleTime: 30_000,
    },
  );

  // Don't render anything if still loading or no results
  if (similarQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Similar Ideas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!similarQuery.data?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Similar Ideas
          {aiStatus.data?.available && (
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {similarQuery.data.map((idea) => (
          <Link
            key={idea.id}
            href={`/campaigns/${idea.campaignId}/ideas/${idea.id}`}
            className="hover:bg-accent block rounded-md border p-3 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{idea.title}</p>
                {idea.teaser && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{idea.teaser}</p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{idea.campaignTitle}</span>
                  {idea.contributor.name && (
                    <span className="text-muted-foreground text-xs">
                      by {idea.contributor.name}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {Math.round(idea.score * 100)}%
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
