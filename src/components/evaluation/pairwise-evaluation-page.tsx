"use client";

import { useEffect, useMemo } from "react";
import { PairwiseComparisonView } from "./pairwise-comparison";
import { usePairwiseEvaluationStore } from "@/stores/pairwise-evaluation.store";
import type { Idea, EvaluationSession } from "@/types/evaluation";

interface PairwiseEvaluationPageProps {
  session: EvaluationSession;
  ideas: Idea[];
}

export function PairwiseEvaluationPage({
  session,
  ideas,
}: PairwiseEvaluationPageProps) {
  const { initialize, reset } = usePairwiseEvaluationStore();

  const sortedCriteria = useMemo(
    () => [...session.criteria].sort((a, b) => a.sortOrder - b.sortOrder),
    [session.criteria],
  );

  useEffect(() => {
    initialize(session.id, ideas, sortedCriteria);
    return () => {
      reset();
    };
  }, [session.id, ideas, sortedCriteria, initialize, reset]);

  const handleSubmit = (submission: {
    ideaAId: string;
    ideaBId: string;
    scores: Array<{ criterionId: string; score: number }>;
  }) => {
    // TODO: call trpc.evaluation.submitPairwise.mutate({ sessionId, ...submission })
    void submission;
  };

  const handleSkip = (ideaAId: string, ideaBId: string) => {
    // TODO: call trpc.evaluation.skipPair.mutate({ sessionId, ideaAId, ideaBId })
    void ideaAId;
    void ideaBId;
  };

  const handleComplete = () => {
    // In a full implementation, this would:
    // 1. Navigate to results page or back to campaign
    // 2. Mark the evaluator's session as complete
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] px-4 py-8 sm:px-6 lg:px-8">
      <PairwiseComparisonView
        sessionName={session.name}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        onComplete={handleComplete}
      />
    </div>
  );
}
