"use client";

import { cn } from "@/lib/utils";

const PERSPECTIVES = [
  {
    value: "WHITE_FACTS",
    label: "Facts & Data",
    color: "#F5F5F5",
    borderColor: "border-gray-300",
    textColor: "text-gray-800",
  },
  {
    value: "RED_EMOTION",
    label: "Emotions",
    color: "#EF4444",
    borderColor: "border-red-400",
    textColor: "text-red-700",
  },
  {
    value: "BLACK_CAUTION",
    label: "Caution",
    color: "#1F2937",
    borderColor: "border-gray-700",
    textColor: "text-gray-900",
  },
  {
    value: "YELLOW_OPTIMISM",
    label: "Optimism",
    color: "#F59E0B",
    borderColor: "border-yellow-400",
    textColor: "text-yellow-700",
  },
  {
    value: "GREEN_CREATIVITY",
    label: "Creativity",
    color: "#10B981",
    borderColor: "border-green-400",
    textColor: "text-green-700",
  },
  {
    value: "BLUE_PROCESS",
    label: "Process",
    color: "#3B82F6",
    borderColor: "border-blue-400",
    textColor: "text-blue-700",
  },
] as const;

export type PerspectiveValue = (typeof PERSPECTIVES)[number]["value"];

interface PerspectiveSelectorProps {
  selected?: PerspectiveValue | null;
  onSelect: (perspective: PerspectiveValue | null) => void;
  size?: "sm" | "md";
}

export function PerspectiveSelector({ selected, onSelect, size = "md" }: PerspectiveSelectorProps) {
  const dotSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div
      className="flex items-center gap-1.5"
      role="radiogroup"
      aria-label="Discussion perspective"
    >
      {PERSPECTIVES.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={selected === p.value}
          aria-label={p.label}
          title={p.label}
          onClick={() => onSelect(selected === p.value ? null : p.value)}
          className={cn(
            "rounded-full border-2 transition-all hover:scale-110",
            dotSize,
            selected === p.value
              ? `${p.borderColor} ring-2 ring-gray-400 ring-offset-1`
              : "border-transparent",
          )}
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

export function perspectiveLabel(value: string): string {
  const p = PERSPECTIVES.find((p) => p.value === value);
  return p?.label ?? value;
}

export function perspectiveColor(value: string): string {
  const p = PERSPECTIVES.find((p) => p.value === value);
  return p?.color ?? "#9CA3AF";
}

export { PERSPECTIVES };
