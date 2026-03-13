"use client";

import { cn } from "@/lib/utils";
import { PERSPECTIVES, type PerspectiveValue } from "./perspective-selector";

interface PerspectiveFilterProps {
  selected?: PerspectiveValue | null;
  onSelect: (perspective: PerspectiveValue | null) => void;
}

export function PerspectiveFilter({ selected, onSelect }: PerspectiveFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          !selected ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200",
        )}
      >
        All
      </button>
      {PERSPECTIVES.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onSelect(selected === p.value ? null : p.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selected === p.value
              ? `${p.borderColor} border-2 ${p.textColor} bg-white`
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
          )}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.label}
        </button>
      ))}
    </div>
  );
}
