"use client";

import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
  SEEDING: {
    label: "Seeding",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  SUBMISSION: {
    label: "Submission",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DISCUSSION_VOTING: {
    label: "Discussion & Voting",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  EVALUATION: {
    label: "Evaluation",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
