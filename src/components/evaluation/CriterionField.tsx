"use client";

import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";

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

type ResponseValue = {
  scoreValue?: number;
  textValue?: string;
  boolValue?: boolean;
};

interface CriterionFieldProps {
  criterion: Criterion;
  value: ResponseValue | undefined;
  isSaving: boolean;
  isSaved: boolean;
  onScoreChange: (criterionId: string, score: number) => void;
  onTextChange: (criterionId: string, text: string) => void;
  onBoolChange: (criterionId: string, checked: boolean) => void;
}

export function CriterionField({
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
