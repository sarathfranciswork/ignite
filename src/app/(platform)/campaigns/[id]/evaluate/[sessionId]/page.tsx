"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScorecardForm } from "@/components/evaluation/ScorecardForm";
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
  const ideas = session.ideas;
  const currentIdea = ideas[currentIdeaIndex];

  return (
    <div className="space-y-6">
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
                    onClick={() => setCurrentIdeaIndex((i) => i - 1)}
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
                    onClick={() => setCurrentIdeaIndex((i) => i + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <IdeaSelector
                  ideas={ideas}
                  currentIndex={currentIdeaIndex}
                  onSelect={setCurrentIdeaIndex}
                />
              </div>

              {currentIdea && (
                <ScorecardForm
                  key={`${params.sessionId}-${currentIdea.ideaId}`}
                  sessionId={params.sessionId}
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
          <EvaluationProgress sessionId={params.sessionId} />

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900">Ideas in this Session</h3>
            <ul className="mt-3 space-y-2">
              {ideas.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentIdeaIndex(idx)}
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
