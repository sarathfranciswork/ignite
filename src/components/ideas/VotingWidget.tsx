"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface VotingWidgetProps {
  ideaId: string;
}

export function VotingWidget({ ideaId }: VotingWidgetProps) {
  const utils = trpc.useUtils();

  const votesQuery = trpc.engagement.getIdeaVotes.useQuery({ ideaId });

  if (votesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (!votesQuery.data?.hasVoting) {
    return null;
  }

  const { criteria, totalVoters } = votesQuery.data;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-gray-900">Community Rating</h3>
        <span className="text-xs text-gray-400">
          {totalVoters} {totalVoters === 1 ? "voter" : "voters"}
        </span>
      </div>
      <div className="space-y-4">
        {criteria.map((criterion) => (
          <CriterionRow
            key={criterion.criterionId}
            ideaId={ideaId}
            criterionId={criterion.criterionId}
            label={criterion.label}
            averageScore={criterion.averageScore}
            totalVoters={criterion.totalVoters}
            userScore={criterion.userScore}
            onVoted={() => {
              void utils.engagement.getIdeaVotes.invalidate({ ideaId });
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface CriterionRowProps {
  ideaId: string;
  criterionId: string;
  label: string;
  averageScore: number;
  totalVoters: number;
  userScore: number | null;
  onVoted: () => void;
}

function CriterionRow({
  ideaId,
  criterionId,
  label,
  averageScore,
  totalVoters,
  userScore,
  onVoted,
}: CriterionRowProps) {
  const [hoveredStar, setHoveredStar] = React.useState(0);

  const voteMutation = trpc.engagement.upsertVote.useMutation({
    onSuccess: () => {
      onVoted();
    },
  });

  const deleteMutation = trpc.engagement.deleteVote.useMutation({
    onSuccess: () => {
      onVoted();
    },
  });

  function handleStarClick(score: number) {
    if (score === userScore) {
      deleteMutation.mutate({ ideaId, criterionId });
    } else {
      voteMutation.mutate({ ideaId, criterionId, score });
    }
  }

  const isPending = voteMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-xs text-gray-400">
          {averageScore > 0
            ? `${averageScore.toFixed(1)} avg (${totalVoters})`
            : "No votes yet"}
        </span>
      </div>
      <div
        className="flex gap-0.5"
        onMouseLeave={() => setHoveredStar(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hoveredStar > 0 ? star <= hoveredStar : star <= (userScore ?? 0);
          return (
            <button
              key={star}
              type="button"
              className={cn(
                "rounded p-0.5 transition-colors",
                isPending ? "cursor-wait opacity-50" : "cursor-pointer hover:scale-110",
              )}
              onMouseEnter={() => setHoveredStar(star)}
              onClick={() => handleStarClick(star)}
              disabled={isPending}
              aria-label={`Rate ${star} star${star !== 1 ? "s" : ""} for ${label}`}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  filled ? "fill-amber-400 text-amber-400" : "text-gray-300",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
