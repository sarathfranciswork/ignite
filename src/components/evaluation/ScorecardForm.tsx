"use client";

import * as React from "react";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  visibleWhen: { criterionId: string; value: string } | null;
}

interface ScorecardFormProps {
  sessionId: string;
  ideaId: string;
  ideaTitle: string;
  ideaTeaser: string | null;
  criteria: Criterion[];
}

type ResponseValue = {
  scoreValue?: number;
  textValue?: string;
  boolValue?: boolean;
};

const AUTO_SAVE_DELAY_MS = 800;

export function ScorecardForm({
  sessionId,
  ideaId,
  ideaTitle,
  ideaTeaser,
  criteria,
}: ScorecardFormProps) {
  const [values, setValues] = React.useState<Record<string, ResponseValue>>({});
  const [savingFields, setSavingFields] = React.useState<Set<string>>(new Set());
  const [savedFields, setSavedFields] = React.useState<Set<string>>(new Set());
  const debounceTimers = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const myResponsesQuery = trpc.evaluation.myResponses.useQuery(
    { sessionId, ideaId },
    {
      refetchOnWindowFocus: false,
    },
  );

  React.useEffect(() => {
    if (myResponsesQuery.data) {
      const restored: Record<string, ResponseValue> = {};
      for (const r of myResponsesQuery.data.responses) {
        const val: ResponseValue = {};
        if (r.scoreValue !== null) val.scoreValue = r.scoreValue;
        if (r.textValue !== null) val.textValue = r.textValue;
        if (r.boolValue !== null) val.boolValue = r.boolValue;
        restored[r.criterionId] = val;
      }
      setValues(restored);
    }
  }, [myResponsesQuery.data]);

  const submitMutation = trpc.evaluation.submitResponse.useMutation({
    onSuccess: (_data, variables) => {
      for (const resp of variables.responses) {
        setSavingFields((prev) => {
          const next = new Set(prev);
          next.delete(resp.criterionId);
          return next;
        });
        setSavedFields((prev) => new Set(prev).add(resp.criterionId));
        setTimeout(() => {
          setSavedFields((prev) => {
            const next = new Set(prev);
            next.delete(resp.criterionId);
            return next;
          });
        }, 2000);
      }
    },
    onError: (_err, variables) => {
      for (const resp of variables.responses) {
        setSavingFields((prev) => {
          const next = new Set(prev);
          next.delete(resp.criterionId);
          return next;
        });
      }
    },
  });

  const autoSave = React.useCallback(
    (criterionId: string, value: ResponseValue) => {
      const existing = debounceTimers.current.get(criterionId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        setSavingFields((prev) => new Set(prev).add(criterionId));
        submitMutation.mutate({
          sessionId,
          ideaId,
          responses: [{ criterionId, ...value }],
        });
        debounceTimers.current.delete(criterionId);
      }, AUTO_SAVE_DELAY_MS);

      debounceTimers.current.set(criterionId, timer);
    },
    [sessionId, ideaId, submitMutation],
  );

  const handleScoreChange = React.useCallback(
    (criterionId: string, score: number) => {
      const newValue: ResponseValue = { ...values[criterionId], scoreValue: score };
      setValues((prev) => ({ ...prev, [criterionId]: newValue }));
      autoSave(criterionId, newValue);
    },
    [values, autoSave],
  );

  const handleTextChange = React.useCallback(
    (criterionId: string, text: string) => {
      const newValue: ResponseValue = { ...values[criterionId], textValue: text };
      setValues((prev) => ({ ...prev, [criterionId]: newValue }));
      autoSave(criterionId, newValue);
    },
    [values, autoSave],
  );

  const handleBoolChange = React.useCallback(
    (criterionId: string, checked: boolean) => {
      const newValue: ResponseValue = { ...values[criterionId], boolValue: checked };
      setValues((prev) => ({ ...prev, [criterionId]: newValue }));
      autoSave(criterionId, newValue);
    },
    [values, autoSave],
  );

  const isFieldVisible = React.useCallback(
    (criterion: Criterion): boolean => {
      if (!criterion.visibleWhen) return true;
      const dep = values[criterion.visibleWhen.criterionId];
      if (!dep) return false;
      const depStr = dep.scoreValue?.toString() ?? dep.textValue ?? dep.boolValue?.toString() ?? "";
      return depStr === criterion.visibleWhen.value;
    },
    [values],
  );

  if (myResponsesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading your responses...</span>
      </div>
    );
  }

  const visibleCriteria = criteria.filter(isFieldVisible);
  const totalCriteria = visibleCriteria.length;
  const answeredCriteria = visibleCriteria.filter((c) => {
    const v = values[c.id];
    if (!v) return false;
    if (c.fieldType === "SELECTION_SCALE") return v.scoreValue !== undefined;
    if (c.fieldType === "TEXT") return (v.textValue ?? "").trim().length > 0;
    if (c.fieldType === "CHECKBOX") return v.boolValue !== undefined;
    return false;
  }).length;

  const progressPercent =
    totalCriteria > 0 ? Math.round((answeredCriteria / totalCriteria) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900">{ideaTitle}</h3>
        {ideaTeaser && <p className="mt-1 text-sm text-gray-500">{ideaTeaser}</p>}

        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600">
            {answeredCriteria}/{totalCriteria} ({progressPercent}%)
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {visibleCriteria.map((criterion) => (
          <CriterionField
            key={criterion.id}
            criterion={criterion}
            value={values[criterion.id]}
            isSaving={savingFields.has(criterion.id)}
            isSaved={savedFields.has(criterion.id)}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
            onBoolChange={handleBoolChange}
          />
        ))}
      </div>
    </div>
  );
}

interface CriterionFieldProps {
  criterion: Criterion;
  value: ResponseValue | undefined;
  isSaving: boolean;
  isSaved: boolean;
  onScoreChange: (criterionId: string, score: number) => void;
  onTextChange: (criterionId: string, text: string) => void;
  onBoolChange: (criterionId: string, checked: boolean) => void;
}

function CriterionField({
  criterion,
  value,
  isSaving,
  isSaved,
  onScoreChange,
  onTextChange,
  onBoolChange,
}: CriterionFieldProps) {
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

        <div className="flex items-center gap-1.5">
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          {isSaved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
      </div>

      <div className="mt-3">
        {criterion.fieldType === "SELECTION_SCALE" && (
          <ScaleInput
            criterionId={criterion.id}
            min={criterion.scaleMin ?? 1}
            max={criterion.scaleMax ?? 5}
            labels={criterion.scaleLabels}
            value={value?.scoreValue}
            onChange={onScoreChange}
          />
        )}

        {criterion.fieldType === "TEXT" && (
          <Textarea
            value={value?.textValue ?? ""}
            onChange={(e) => onTextChange(criterion.id, e.target.value)}
            placeholder="Enter your response..."
            className="min-h-[80px] resize-y"
          />
        )}

        {criterion.fieldType === "CHECKBOX" && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={value?.boolValue ?? false}
              onChange={(e) => onBoolChange(criterion.id, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        )}
      </div>
    </div>
  );
}

interface ScaleInputProps {
  criterionId: string;
  min: number;
  max: number;
  labels: Record<string, string> | null;
  value: number | undefined;
  onChange: (criterionId: string, score: number) => void;
}

function ScaleInput({ criterionId, min, max, labels, value, onChange }: ScaleInputProps) {
  const options: number[] = [];
  for (let i = min; i <= max; i++) {
    options.push(i);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {options.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(criterionId, score)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
              value === score
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50"
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{labels[String(min)] ?? ""}</span>
          <span>{labels[String(max)] ?? ""}</span>
        </div>
      )}
    </div>
  );
}
