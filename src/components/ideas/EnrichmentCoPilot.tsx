"use client";

import * as React from "react";
import { Sparkles, Loader2, Check, X, Lightbulb, Tag, FolderOpen, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

interface EnrichmentCoPilotProps {
  title: string;
  teaser?: string;
  description?: string;
  category?: string;
  tags: string[];
  onAcceptTag: (tag: string) => void;
  onAcceptCategory: (category: string) => void;
  ideaId?: string;
}

interface DismissedState {
  tags: Set<string>;
  category: boolean;
  gaps: Set<string>;
  hints: Set<string>;
}

export function EnrichmentCoPilot({
  title,
  teaser,
  description,
  category,
  tags,
  onAcceptTag,
  onAcceptCategory,
  ideaId,
}: EnrichmentCoPilotProps) {
  const [dismissed, setDismissed] = React.useState<DismissedState>({
    tags: new Set(),
    category: false,
    gaps: new Set(),
    hints: new Set(),
  });

  const statusQuery = trpc.ai.enrichmentStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  const enrichMutation = trpc.ai.enrich.useMutation();
  const copilotEventMutation = trpc.ai.copilotEvent.useMutation();

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputRef = React.useRef<string>("");

  React.useEffect(() => {
    if (!title || title.length < 3) return;

    const inputKey = `${title}|${teaser ?? ""}|${description ?? ""}|${category ?? ""}|${tags.join(",")}`;
    if (inputKey === lastInputRef.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      lastInputRef.current = inputKey;
      enrichMutation.mutate({
        title,
        teaser: teaser ?? undefined,
        description: description ?? undefined,
        category: category ?? undefined,
        tags,
      });
    }, 1000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, teaser, description, category, tags]);

  function handleAcceptTag(tag: string) {
    onAcceptTag(tag);
    copilotEventMutation.mutate({
      ideaId,
      suggestionType: "tag",
      suggestionValue: tag,
      action: "accepted",
    });
  }

  function handleDismissTag(tag: string) {
    setDismissed((prev) => ({
      ...prev,
      tags: new Set(prev.tags).add(tag),
    }));
    copilotEventMutation.mutate({
      ideaId,
      suggestionType: "tag",
      suggestionValue: tag,
      action: "dismissed",
    });
  }

  function handleAcceptCategory(cat: string) {
    onAcceptCategory(cat);
    copilotEventMutation.mutate({
      ideaId,
      suggestionType: "category",
      suggestionValue: cat,
      action: "accepted",
    });
  }

  function handleDismissCategory() {
    setDismissed((prev) => ({ ...prev, category: true }));
    copilotEventMutation.mutate({
      ideaId,
      suggestionType: "category",
      suggestionValue: enrichMutation.data?.suggestedCategory ?? "",
      action: "dismissed",
    });
  }

  function handleDismissGap(gap: string) {
    setDismissed((prev) => ({
      ...prev,
      gaps: new Set(prev.gaps).add(gap),
    }));
    copilotEventMutation.mutate({
      ideaId,
      suggestionType: "gap",
      suggestionValue: gap,
      action: "dismissed",
    });
  }

  function handleDismissHint(hint: string) {
    setDismissed((prev) => ({
      ...prev,
      hints: new Set(prev.hints).add(hint),
    }));
    copilotEventMutation.mutate({
      ideaId,
      suggestionType: "description",
      suggestionValue: hint,
      action: "dismissed",
    });
  }

  if (!statusQuery.data?.available) return null;

  const data = enrichMutation.data;
  const isLoading = enrichMutation.isPending;
  const hasNoContent = !title || title.length < 3;

  const visibleTags =
    data?.suggestedTags.filter((t) => !dismissed.tags.has(t) && !tags.includes(t)) ?? [];
  const visibleCategory =
    data?.suggestedCategory && !dismissed.category && data.suggestedCategory !== category
      ? data.suggestedCategory
      : null;
  const visibleGaps = data?.gaps.filter((g) => !dismissed.gaps.has(g)) ?? [];
  const visibleHints = data?.descriptionHints.filter((h) => !dismissed.hints.has(h)) ?? [];

  const hasAnySuggestions =
    visibleTags.length > 0 ||
    visibleCategory !== null ||
    visibleGaps.length > 0 ||
    visibleHints.length > 0;

  if (hasNoContent && !isLoading) return null;

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-blue-600" />
          AI Co-Pilot
          {data?.aiPowered && (
            <Badge variant="secondary" className="text-xs">
              AI-Powered
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Analyzing your idea...
          </div>
        )}

        {!isLoading && !hasAnySuggestions && data && (
          <p className="text-sm text-gray-500">
            Looking good! No additional suggestions at this time.
          </p>
        )}

        {visibleTags.length > 0 && (
          <SuggestionSection icon={<Tag className="h-3.5 w-3.5" />} title="Suggested Tags">
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleAcceptTag(tag)}
                    className="rounded-full p-0.5 text-green-600 hover:bg-green-50"
                    title="Accept tag"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissTag(tag)}
                    className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100"
                    title="Dismiss tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </SuggestionSection>
        )}

        {visibleCategory && (
          <SuggestionSection
            icon={<FolderOpen className="h-3.5 w-3.5" />}
            title="Suggested Category"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{visibleCategory}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-green-600"
                onClick={() => handleAcceptCategory(visibleCategory)}
              >
                <Check className="mr-1 h-3 w-3" />
                Apply
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-gray-400"
                onClick={handleDismissCategory}
              >
                <X className="mr-1 h-3 w-3" />
                Dismiss
              </Button>
            </div>
          </SuggestionSection>
        )}

        {visibleGaps.length > 0 && (
          <SuggestionSection
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            title="Missing Information"
          >
            <ul className="space-y-1.5">
              {visibleGaps.map((gap) => (
                <li key={gap} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex-1">{gap}</span>
                  <button
                    type="button"
                    onClick={() => handleDismissGap(gap)}
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </SuggestionSection>
        )}

        {visibleHints.length > 0 && (
          <SuggestionSection icon={<Lightbulb className="h-3.5 w-3.5" />} title="Writing Tips">
            <ul className="space-y-1.5">
              {visibleHints.map((hint) => (
                <li key={hint} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex-1">{hint}</span>
                  <button
                    type="button"
                    onClick={() => handleDismissHint(hint)}
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </SuggestionSection>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
