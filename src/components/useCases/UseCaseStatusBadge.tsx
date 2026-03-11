"use client";

import { cn } from "@/lib/utils";

type UseCaseStatusValue =
  | "IDENTIFIED"
  | "QUALIFICATION"
  | "EVALUATION"
  | "PILOT"
  | "PARTNERSHIP"
  | "ARCHIVED";

const STATUS_CONFIG: Record<UseCaseStatusValue, { label: string; className: string }> = {
  IDENTIFIED: {
    label: "Identified",
    className: "bg-gray-50 text-gray-600 border-gray-200",
  },
  QUALIFICATION: {
    label: "Qualification",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  EVALUATION: {
    label: "Evaluation",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  PILOT: {
    label: "Pilot",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PARTNERSHIP: {
    label: "Partnership",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

interface UseCaseStatusBadgeProps {
  status: UseCaseStatusValue;
  className?: string;
}

export function UseCaseStatusBadge({ status, className }: UseCaseStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
