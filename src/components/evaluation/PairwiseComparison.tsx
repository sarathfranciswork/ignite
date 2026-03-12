"use client";

import * as React from "react";
import { CheckCircle2, ChevronRight, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

interface Criterion {
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
}

interface PairwiseComparisonProps {
  sessionId: string;
  ideaA: { id: string; title: string; teaser: string | null };
  ideaB: { id: string; title: string; teaser: string | null };
  criteria: Criterion[];
  pairIndex: number;
  totalPairs: number;
  onDoneNext: () => void;
}

const SLIDER_MIN = -5;
const SLIDER_MAX = 5;

export function PairwiseComparison({
  sessionId,
  ideaA,
  ideaB,
  criteria,
  pairIndex,
  totalPairs,
  onDoneNext,
}: PairwiseComparisonProps) {
  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSaved, setIsSaved] = React.useState(false);

  const scaleCriteria = criteria.filter((c) => c.fieldType === "SELECTION_SCALE");

  const myComparisonQuery = trpc.evaluation.pairwiseMyComparison.useQuery(
    { sessionId, ideaAId: ideaA.id, ideaBId: ideaB.id },
    { refetchOnWindowFocus: false },
  );

  React.useEffect(() => {
    if (myComparisonQuery.data) {
      const restored: Record<string, number> = {};
      for (const c of myComparisonQuery.data.comparisons) {
        restored[c.criterionId] = c.score;
      }
      setScores(restored);
    }
  }, [myComparisonQuery.data]);

  // Reset saved state when pair changes
  React.useEffect(() => {
    setIsSaved(false);
  }, [ideaA.id, ideaB.id]);

  const submitMutation = trpc.evaluation.pairwiseSubmit.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setIsSaved(true);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const handleScoreChange = React.useCallback((criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
    setIsSaved(false);
  }, []);

  const handleDoneNext = React.useCallback(() => {
    const comparisons = scaleCriteria.map((c) => ({
      criterionId: c.id,
      score: scores[c.id] ?? 0,
    }));

    setIsSaving(true);
    submitMutation.mutate(
      {
        sessionId,
        ideaAId: ideaA.id,
        ideaBId: ideaB.id,
        comparisons,
      },
      {
        onSuccess: () => {
          onDoneNext();
        },
      },
    );
  }, [scaleCriteria, scores, sessionId, ideaA.id, ideaB.id, submitMutation, onDoneNext]);

  if (myComparisonQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading comparison...</span>
      </div>
    );
  }

  const answeredCount = scaleCriteria.filter((c) => scores[c.id] !== undefined).length;
  const progressPercent =
    scaleCriteria.length > 0 ? Math.round((answeredCount / scaleCriteria.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Pair header with progress */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            Pair {pairIndex + 1} of {totalPairs}
          </span>
          <div className="flex items-center gap-2">
            {isSaved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            <span className="text-xs font-medium text-gray-600">
              {answeredCount}/{scaleCriteria.length} criteria ({progressPercent}%)
            </span>
          </div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-primary-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Split-pane: Two ideas side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <IdeaCard idea={ideaA} label="Idea A" side="left" />
        <IdeaCard idea={ideaB} label="Idea B" side="right" />
      </div>

      {/* Criteria sliders */}
      <div className="space-y-4">
        {scaleCriteria.map((criterion) => (
          <CriterionSlider
            key={criterion.id}
            criterion={criterion}
            value={scores[criterion.id]}
            ideaATitle={ideaA.title}
            ideaBTitle={ideaB.title}
            onChange={handleScoreChange}
          />
        ))}
      </div>

      {/* Done & Next button */}
      <div className="flex items-center justify-end gap-3">
        <Button onClick={handleDoneNext} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {pairIndex + 1 >= totalPairs ? "Done" : "Done & Next"}
        </Button>
      </div>
    </div>
  );
}

// ── Idea Card ────────────────────────────────────────────────

interface IdeaCardProps {
  idea: { id: string; title: string; teaser: string | null };
  label: string;
  side: "left" | "right";
}

function IdeaCard({ idea, label, side }: IdeaCardProps) {
  return (
    <div
      className={`rounded-xl border-2 p-5 ${
        side === "left" ? "border-blue-200 bg-blue-50/50" : "border-amber-200 bg-amber-50/50"
      }`}
    >
      <span
        className={`text-xs font-semibold uppercase tracking-wider ${
          side === "left" ? "text-blue-600" : "text-amber-600"
        }`}
      >
        {label}
      </span>
      <h3 className="mt-2 text-base font-semibold text-gray-900">{idea.title}</h3>
      {idea.teaser && <p className="mt-1 text-sm text-gray-600">{idea.teaser}</p>}
    </div>
  );
}

// ── Criterion Slider ─────────────────────────────────────────

interface CriterionSliderProps {
  criterion: Criterion;
  value: number | undefined;
  ideaATitle: string;
  ideaBTitle: string;
  onChange: (criterionId: string, value: number) => void;
}

function CriterionSlider({
  criterion,
  value,
  ideaATitle,
  ideaBTitle,
  onChange,
}: CriterionSliderProps) {
  const currentValue = value ?? 0;

  const getSliderColor = (val: number): string => {
    if (val === 0) return "bg-gray-400";
    if (val > 0) return "bg-blue-500";
    return "bg-amber-500";
  };

  const getLabel = (val: number): string => {
    const absVal = Math.abs(val);
    if (absVal === 0) return "Equal";
    const intensity = absVal <= 1 ? "Slightly" : absVal <= 3 ? "Moderately" : "Strongly";
    const winner = val > 0 ? "A" : "B";
    return `${intensity} ${winner}`;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold text-gray-900">
              {criterion.title}
              {criterion.isRequired && <span className="ml-0.5 text-red-500">*</span>}
            </Label>
            {criterion.weight > 1 && (
              <span className="text-xs text-gray-400">Weight: {criterion.weight}x</span>
            )}
            {criterion.guidanceText && (
              <Tooltip content={criterion.guidanceText}>
                <Info className="h-4 w-4 cursor-help text-gray-400" />
              </Tooltip>
            )}
          </div>
          {criterion.description && (
            <p className="mt-1 text-xs text-gray-500">{criterion.description}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            currentValue === 0
              ? "bg-gray-100 text-gray-600"
              : currentValue > 0
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700"
          }`}
        >
          {getLabel(currentValue)}
        </span>
      </div>

      <div className="mt-4">
        {/* Slider labels */}
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span className="max-w-[120px] truncate text-blue-600" title={ideaATitle}>
            {ideaATitle}
          </span>
          <span className="text-gray-400">Equal</span>
          <span className="max-w-[120px] truncate text-amber-600" title={ideaBTitle}>
            {ideaBTitle}
          </span>
        </div>

        {/* Slider track with discrete steps */}
        <div className="relative py-2">
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={1}
            value={currentValue}
            onChange={(e) => onChange(criterion.id, Number(e.target.value))}
            className="slider-pairwise w-full cursor-pointer"
          />

          {/* Step markers */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-[2px]">
            {Array.from({ length: SLIDER_MAX - SLIDER_MIN + 1 }, (_, i) => {
              const stepVal = SLIDER_MIN + i;
              const isCenter = stepVal === 0;
              return (
                <div
                  key={stepVal}
                  className={`h-2 w-0.5 rounded-full ${
                    isCenter ? "h-3 bg-gray-400" : "bg-gray-200"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Numeric indicator */}
        <div className="flex justify-center">
          <div className="flex gap-1">
            {Array.from({ length: SLIDER_MAX - SLIDER_MIN + 1 }, (_, i) => {
              const stepVal = SLIDER_MIN + i;
              const isSelected = currentValue === stepVal;
              return (
                <button
                  key={stepVal}
                  type="button"
                  onClick={() => onChange(criterion.id, stepVal)}
                  className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors ${
                    isSelected
                      ? `text-white ${getSliderColor(stepVal)}`
                      : "text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {stepVal > 0 ? `+${stepVal}` : stepVal}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
