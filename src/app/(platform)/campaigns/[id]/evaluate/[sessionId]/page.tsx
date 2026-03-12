"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScorecardForm } from "@/components/evaluation/ScorecardForm";
import { PairwiseComparison } from "@/components/evaluation/PairwiseComparison";
import { EvaluationProgress } from "@/components/evaluation/EvaluationProgress";
import { trpc } from "@/lib/trpc";

export default function EvaluateSessionPage() {
  const params = useParams<{ id: string; sessionId: string }>();
  const [currentIdeaIndex, setCurrentIdeaIndex] = React.useState(0);

  const sessionQuery = trpc.evaluation.getById.useQuery(
    { id: params.sessionId },
    { enabled: !!params.sessionId },
  );

  if (sessionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (sessionQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load evaluation session.</p>
        <Link
          href={`/campaigns/${params.id}`}
          className="mt-2 inline-block text-sm text-primary-600"
        >
          Back to campaign
        </Link>
      </div>
    );
  }

  if (!sessionQuery.data) return null;

  const session = sessionQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/campaigns/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Campaign
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{session.title}</h1>
            {session.description && <p className="text-sm text-gray-500">{session.description}</p>}
          </div>
        </div>
        <Link href={`/campaigns/${params.id}/evaluate/${params.sessionId}/results`}>
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            View Results
          </Button>
        </Link>
      </div>

      {session.type === "PAIRWISE" ? (
        <PairwiseEvaluationView
          sessionId={params.sessionId}
          campaignId={params.id}
          session={session}
        />
      ) : (
        <ScorecardEvaluationView
          sessionId={params.sessionId}
          session={session}
          currentIdeaIndex={currentIdeaIndex}
          onIdeaIndexChange={setCurrentIdeaIndex}
        />
      )}
    </div>
  );
}

// ── Pairwise Evaluation View ─────────────────────────────────

interface SessionData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  criteria: Array<{
    id: string;
    title: string;
    description: string | null;
    guidanceText: string | null;
    fieldType: string;
    weight: number;
    sortOrder: number;
    isRequired: boolean;
    scaleMin: number | null;
    scaleMax: number | null;
    scaleLabels: Record<string, string> | null;
    visibleWhen: { criterionId: string; value: string } | null;
  }>;
  ideas: Array<{
    id: string;
    ideaId: string | null;
    sortOrder: number;
    idea: { id: string; title: string; teaser: string | null; status: string } | null;
  }>;
}

interface PairwiseViewProps {
  sessionId: string;
  campaignId: string;
  session: SessionData;
}

function PairwiseEvaluationView({ sessionId, campaignId, session }: PairwiseViewProps) {
  const utils = trpc.useUtils();

  const nextPairQuery = trpc.evaluation.pairwiseNextPair.useQuery(
    { sessionId },
    { refetchOnWindowFocus: false },
  );

  const handleDoneNext = React.useCallback(() => {
    utils.evaluation.pairwiseNextPair.invalidate({ sessionId });
    utils.evaluation.pairwiseProgress.invalidate({ sessionId });
  }, [utils, sessionId]);

  if (nextPairQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  if (nextPairQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load pairwise pairs.</p>
      </div>
    );
  }

  const nextPair = nextPairQuery.data;
  if (!nextPair) return null;

  if (session.ideas.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">Not Enough Ideas</h3>
        <p className="mt-2 text-sm text-gray-500">
          Pairwise evaluation requires at least 2 ideas in the session.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {nextPair.completed ? (
          <PairwiseCompleteView campaignId={campaignId} />
        ) : nextPair.pair ? (
          <PairwiseComparison
            key={`${nextPair.pair.ideaA.id}-${nextPair.pair.ideaB.id}`}
            sessionId={sessionId}
            ideaA={nextPair.pair.ideaA}
            ideaB={nextPair.pair.ideaB}
            criteria={session.criteria}
            pairIndex={nextPair.pairIndex}
            totalPairs={nextPair.totalPairs}
            onDoneNext={handleDoneNext}
          />
        ) : null}
      </div>

      <div className="space-y-6">
        <PairwiseProgressSidebar sessionId={sessionId} />

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Ideas in this Session</h3>
          <ul className="mt-3 space-y-2">
            {session.ideas.map((item) => (
              <li key={item.id} className="rounded-lg px-3 py-2 text-left text-sm text-gray-600">
                {item.idea?.title}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PairwiseCompleteView({ campaignId }: { campaignId: string }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-12 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">All Comparisons Complete</h3>
      <p className="mt-2 text-sm text-gray-500">
        You have completed all pairwise comparisons for this session.
      </p>
      <Link href={`/campaigns/${campaignId}`}>
        <Button variant="outline" className="mt-4">
          Back to Campaign
        </Button>
      </Link>
    </div>
  );
}

function PairwiseProgressSidebar({ sessionId }: { sessionId: string }) {
  const progressQuery = trpc.evaluation.pairwiseProgress.useQuery(
    { sessionId },
    { refetchInterval: 30000 },
  );

  if (!progressQuery.data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  const progress = progressQuery.data;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Progress</h3>
      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Overall</span>
            <span>{progress.overall.percentage}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all"
              style={{ width: `${progress.overall.percentage}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {progress.totalPairs} pair{progress.totalPairs !== 1 ? "s" : ""} to compare
        </p>
        {progress.evaluatorProgress.map((ep) => (
          <div key={ep.userId}>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Evaluator</span>
              <span>
                {ep.completed}/{ep.total} ({ep.percentage}%)
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-gray-100">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  ep.percentage >= 100 ? "bg-green-500" : "bg-primary-500"
                }`}
                style={{ width: `${ep.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scorecard Evaluation View (existing, extracted) ──────────

interface ScorecardViewProps {
  sessionId: string;
  session: SessionData;
  currentIdeaIndex: number;
  onIdeaIndexChange: (index: number) => void;
}

function ScorecardEvaluationView({
  sessionId,
  session,
  currentIdeaIndex,
  onIdeaIndexChange,
}: ScorecardViewProps) {
  const ideas = session.ideas.filter((i) => i.idea !== null && i.ideaId !== null) as Array<{
    id: string;
    ideaId: string;
    sortOrder: number;
    idea: { id: string; title: string; teaser: string | null; status: string };
  }>;
  const currentIdea = ideas[currentIdeaIndex];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {ideas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Ideas to Evaluate</h3>
            <p className="mt-2 text-sm text-gray-500">
              No ideas have been added to this evaluation session yet.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdeaIndex === 0}
                  onClick={() => onIdeaIndexChange(currentIdeaIndex - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-gray-700">
                  Idea {currentIdeaIndex + 1} of {ideas.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIdeaIndex >= ideas.length - 1}
                  onClick={() => onIdeaIndexChange(currentIdeaIndex + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <IdeaSelector
                ideas={ideas}
                currentIndex={currentIdeaIndex}
                onSelect={onIdeaIndexChange}
              />
            </div>

            {currentIdea && (
              <ScorecardForm
                key={`${sessionId}-${currentIdea.ideaId}`}
                sessionId={sessionId}
                ideaId={currentIdea.ideaId}
                ideaTitle={currentIdea.idea.title}
                ideaTeaser={currentIdea.idea.teaser}
                criteria={session.criteria}
              />
            )}
          </>
        )}
      </div>

      <div className="space-y-6">
        <EvaluationProgress sessionId={sessionId} />

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Ideas in this Session</h3>
          <ul className="mt-3 space-y-2">
            {ideas.map((item, idx) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onIdeaIndexChange(idx)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    idx === currentIdeaIndex
                      ? "bg-primary-50 font-medium text-primary-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.idea.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface IdeaSelectorProps {
  ideas: Array<{
    id: string;
    ideaId: string;
    idea: { id: string; title: string; teaser: string | null; status: string };
  }>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

function IdeaSelector({ ideas, currentIndex, onSelect }: IdeaSelectorProps) {
  return (
    <select
      value={currentIndex}
      onChange={(e) => onSelect(Number(e.target.value))}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
    >
      {ideas.map((item, idx) => (
        <option key={item.id} value={idx}>
          {item.idea.title}
        </option>
      ))}
    </select>
  );
}
