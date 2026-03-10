"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, label, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {label && (
          <div className="mb-1 flex justify-between text-xs text-[var(--gray-500)]">
            <span>{label}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-[var(--gray-100)]"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className="h-full rounded-full bg-[var(--primary-500)] transition-all duration-300 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  },
);

Progress.displayName = "Progress";
