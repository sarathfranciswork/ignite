"use client";

import * as React from "react";
import { Sparkles, Loader2, Check, X, Lightbulb, Tag, FileText, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface IdeaDraft {
  title: string;
  teaser?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

interface EnrichmentSidebarProps {
  draft: IdeaDraft;
  onAcceptSuggestion?: (type: string, suggestion: string) => void;
}

interface DisplaySuggestion {
  type: string;
  label: string;
  suggestion: string;
}

const SUGGESTION_ICONS: Record<string, React.ReactNode> = {
  description: <FileText className="h-4 w-4" />,
  tags: <Tag className="h-4 w-4" />,
  gap: <Lightbulb className="h-4 w-4" />,
  category: <Type className="h-4 w-4" />,
};

function buildDisplaySuggestions(data: {
  suggestedTags: string[];
  suggestedCategory: string | null;
  descriptionHints: string[];
  gaps: string[];
}): DisplaySuggestion[] {
  const suggestions: DisplaySuggestion[] = [];

  if (data.suggestedTags.length > 0) {
    suggestions.push({
      type: "tags",
      label: "Suggested tags",
      suggestion: `Consider adding: ${data.suggestedTags.join(", ")}`,
    });
  }

  if (data.suggestedCategory) {
    suggestions.push({
      type: "category",
      label: "Suggested category",
      suggestion: data.suggestedCategory,
    });
  }

  for (const hint of data.descriptionHints) {
    suggestions.push({
      type: "description",
      label: "Description improvement",
      suggestion: hint,
    });
  }

  for (const gap of data.gaps) {
    suggestions.push({
      type: "gap",
      label: "Missing information",
      suggestion: gap,
    });
  }

  return suggestions;
}

export function EnrichmentSidebar({ draft, onAcceptSuggestion }: EnrichmentSidebarProps) {
  const [dismissed, setDismissed] = React.useState<Set<number>>(new Set());
  const [accepted, setAccepted] = React.useState<Set<number>>(new Set());

  const statusQuery = trpc.ai.enrichmentStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const enrichMutation = trpc.ai.enrich.useMutation();

  const canEnrich = draft.title.length >= 3;

  function handleEnrich() {
    setDismissed(new Set());
    setAccepted(new Set());
    enrichMutation.mutate({
      title: draft.title,
      teaser: draft.teaser || undefined,
      description: draft.description || undefined,
      category: draft.category || undefined,
      tags: draft.tags,
    });
  }

  function handleDismiss(index: number) {
    setDismissed((prev) => new Set(prev).add(index));
  }

  function handleAccept(index: number, type: string, suggestion: string) {
    setAccepted((prev) => new Set(prev).add(index));
    onAcceptSuggestion?.(type, suggestion);
  }

  if (!statusQuery.data?.available) {
    return null;
  }

  const suggestions: DisplaySuggestion[] = enrichMutation.data
    ? buildDisplaySuggestions(enrichMutation.data)
    : [];
  const visibleSuggestions = suggestions.filter(
    (_: DisplaySuggestion, i: number) => !dismissed.has(i) && !accepted.has(i),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          AI Co-Pilot
          {statusQuery.data.aiPowered && (
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-xs">
          Get suggestions to improve your idea before submitting.
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!canEnrich || enrichMutation.isPending}
          onClick={handleEnrich}
        >
          {enrichMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3 w-3" />
              Suggest Improvements
            </>
          )}
        </Button>

        {enrichMutation.isError && (
          <p className="text-xs text-red-600">Failed to generate suggestions. Please try again.</p>
        )}

        {suggestions.length > 0 && visibleSuggestions.length === 0 && (
          <p className="text-muted-foreground py-2 text-center text-xs">
            All suggestions addressed!
          </p>
        )}

        {visibleSuggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion: DisplaySuggestion, index: number) => {
              if (dismissed.has(index) || accepted.has(index)) return null;

              return (
                <div key={index} className="rounded-md border p-3 text-sm">
                  <div className="mb-1 flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5">
                      {SUGGESTION_ICONS[suggestion.type] ?? <Lightbulb className="h-4 w-4" />}
                    </span>
                    <span className="font-medium">{suggestion.label}</span>
                  </div>
                  <p className="text-muted-foreground ml-6 text-xs">{suggestion.suggestion}</p>
                  <div className="ml-6 mt-2 flex gap-1">
                    {onAcceptSuggestion && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleAccept(index, suggestion.type, suggestion.suggestion)}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Noted
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleDismiss(index)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
