"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface ComparisonSliderProps {
  criterionName: string;
  criterionDescription?: string | null;
  value: number;
  onChange: (value: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

const TICK_VALUES = [-1, -0.5, 0, 0.5, 1] as const;

const TICK_LABELS: Record<number, string> = {
  [-1]: "Strongly A",
  [-0.5]: "Slightly A",
  [0]: "Equal",
  [0.5]: "Slightly B",
  [1]: "Strongly B",
};

export function ComparisonSlider({
  criterionName,
  criterionDescription,
  value,
  onChange,
  leftLabel = "Idea A",
  rightLabel = "Idea B",
  disabled = false,
}: ComparisonSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange],
  );

  const getThumbColor = (): string => {
    if (value < -0.25) return "var(--primary-500)";
    if (value > 0.25) return "var(--accent-500)";
    return "var(--gray-400)";
  };

  const getTrackGradient = (): string => {
    const midpoint = ((value + 1) / 2) * 100;
    if (value < 0) {
      return `linear-gradient(to right, var(--primary-200) 0%, var(--primary-400) ${midpoint}%, var(--gray-200) ${midpoint}%, var(--gray-200) 100%)`;
    }
    if (value > 0) {
      return `linear-gradient(to right, var(--gray-200) 0%, var(--gray-200) ${midpoint}%, var(--accent-400) ${midpoint}%, var(--accent-200) 100%)`;
    }
    return "var(--gray-200)";
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-light)] bg-white p-4",
        disabled && "opacity-50",
      )}
    >
      <div className="mb-1 text-sm font-medium text-[var(--gray-900)]">
        {criterionName}
      </div>
      {criterionDescription && (
        <p className="mb-3 text-xs text-[var(--gray-500)]">
          {criterionDescription}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "min-w-[72px] text-right text-xs font-medium transition-colors",
            value < -0.25
              ? "text-[var(--primary-600)]"
              : "text-[var(--gray-400)]",
          )}
        >
          {leftLabel}
        </span>

        <div className="relative flex-1">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={value}
            onChange={handleChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={disabled}
            aria-label={`Compare ideas for ${criterionName}`}
            className="slider-input w-full cursor-pointer"
            style={
              {
                "--thumb-color": getThumbColor(),
                "--track-gradient": getTrackGradient(),
              } as React.CSSProperties
            }
          />

          <div className="mt-1 flex justify-between px-1">
            {TICK_VALUES.map((tick) => (
              <div key={tick} className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-1.5 w-0.5 rounded-full",
                    Math.abs(value - tick) < 0.05
                      ? "bg-[var(--gray-600)]"
                      : "bg-[var(--gray-300)]",
                  )}
                />
                <span className="mt-0.5 text-[10px] text-[var(--gray-400)]">
                  {TICK_LABELS[tick]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <span
          className={cn(
            "min-w-[72px] text-xs font-medium transition-colors",
            value > 0.25
              ? "text-[var(--accent-600)]"
              : "text-[var(--gray-400)]",
          )}
        >
          {rightLabel}
        </span>
      </div>

      {isDragging && (
        <div className="mt-2 text-center text-xs font-medium text-[var(--gray-600)]">
          {value === 0
            ? "Equal"
            : value < 0
              ? `${leftLabel} is better (${Math.round(Math.abs(value) * 100)}%)`
              : `${rightLabel} is better (${Math.round(value * 100)}%)`}
        </div>
      )}
    </div>
  );
}
