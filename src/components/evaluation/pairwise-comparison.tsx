"use client";

import { useCallback } from "react";
import { IdeaCard } from "./idea-card";
import { ComparisonSlider } from "@/components/ui/comparison-slider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePairwiseEvaluationStore } from "@/stores/pairwise-evaluation.store";
import { ArrowRight, SkipForward, CheckCircle2 } from "lucide-react";

interface PairwiseComparisonProps {
  sessionName: string;
  onSubmit: (submission: {
    ideaAId: string;
    ideaBId: string;
    scores: Array<{ criterionId: string; score: number }>;
  }) => void;
  onSkip: (ideaAId: string, ideaBId: string) => void;
  onComplete: () => void;
}

export function PairwiseComparisonView({
  sessionName,
  onSubmit,
  onSkip,
  onComplete,
}: PairwiseComparisonProps) {
  const {
    criteria,
    currentScores,
    getCurrentPair,
    getProgress,
    setScore,
    submitCurrentPair,
    skipCurrentPair,
  } = usePairwiseEvaluationStore();

  const currentPair = getCurrentPair();
  const progress = getProgress();

  const handleSubmit = useCallback(() => {
    const comparison = submitCurrentPair();
    if (comparison) {
      onSubmit(comparison);
    }
  }, [submitCurrentPair, onSubmit]);

  const handleSkip = useCallback(() => {
    if (!currentPair) return;
    const ideaAId = currentPair.ideaA.id;
    const ideaBId = currentPair.ideaB.id;
    skipCurrentPair();
    onSkip(ideaAId, ideaBId);
  }, [currentPair, skipCurrentPair, onSkip]);

  if (!currentPair) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <CheckCircle2 className="h-16 w-16 text-[var(--success-500)]" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--gray-900)]">
            All Comparisons Complete
          </h2>
          <p className="mt-2 text-[var(--gray-500)]">
            You have completed {progress.completedPairs} comparisons
            {progress.skippedPairs > 0 &&
              ` and skipped ${progress.skippedPairs}`}
            .
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={onComplete}>
          Finish Evaluation
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--gray-900)]">
          {sessionName}
        </h1>
        <div className="mt-3 flex items-center gap-4">
          <Progress
            value={progress.completedPairs + progress.skippedPairs}
            max={progress.totalPairs}
            label={`${progress.completedPairs} of ${progress.totalPairs} comparisons`}
            className="flex-1"
          />
          {progress.skippedPairs > 0 && (
            <span className="text-xs text-[var(--gray-400)]">
              {progress.skippedPairs} skipped
            </span>
          )}
        </div>
      </div>

      {/* Side-by-side Ideas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <IdeaCard
          idea={currentPair.ideaA}
          label="Idea A"
          accentColor="primary"
        />
        <IdeaCard
          idea={currentPair.ideaB}
          label="Idea B"
          accentColor="accent"
        />
      </div>

      {/* Criterion Sliders */}
      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--gray-500)]">
          Compare on each criterion
        </h2>
        {criteria.map((criterion) => (
          <ComparisonSlider
            key={criterion.id}
            criterionName={criterion.name}
            criterionDescription={criterion.description}
            value={currentScores.get(criterion.id) ?? 0}
            onChange={(value) => setScore(criterion.id, value)}
            leftLabel={currentPair.ideaA.title}
            rightLabel={currentPair.ideaB.title}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-6">
        <Button variant="ghost" onClick={handleSkip}>
          <SkipForward className="h-4 w-4" />
          Skip Pair
        </Button>
        <Button variant="primary" size="lg" onClick={handleSubmit}>
          Submit & Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
