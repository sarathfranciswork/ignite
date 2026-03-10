"use client";

import type { InsightType } from "@/types/insight";

const TYPE_CONFIG: Record<InsightType, { label: string; className: string }> = {
  SIGNAL: {
    label: "Signal",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  OBSERVATION: {
    label: "Observation",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  OPPORTUNITY: {
    label: "Opportunity",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  RISK: {
    label: "Risk",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

interface InsightTypeBadgeProps {
  type: InsightType;
}

export function InsightTypeBadge({ type }: InsightTypeBadgeProps) {
  const config = TYPE_CONFIG[type];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
