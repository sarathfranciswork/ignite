"use client";

import { cn } from "@/lib/utils";

type RelationshipStatusValue = "PROSPECT" | "ACTIVE" | "ON_HOLD" | "ENDED";
type NdaStatusValue = "NONE" | "PENDING" | "SIGNED" | "EXPIRED";

const RELATIONSHIP_STATUS_CONFIG: Record<
  RelationshipStatusValue,
  { label: string; className: string }
> = {
  PROSPECT: {
    label: "Prospect",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  ENDED: {
    label: "Ended",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

const NDA_STATUS_CONFIG: Record<NdaStatusValue, { label: string; className: string }> = {
  NONE: {
    label: "No NDA",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
  PENDING: {
    label: "NDA Pending",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  SIGNED: {
    label: "NDA Signed",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  EXPIRED: {
    label: "NDA Expired",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

interface RelationshipBadgeProps {
  status: RelationshipStatusValue;
  className?: string;
}

export function RelationshipBadge({ status, className }: RelationshipBadgeProps) {
  const config = RELATIONSHIP_STATUS_CONFIG[status];
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

interface NdaBadgeProps {
  status: NdaStatusValue;
  className?: string;
}

export function NdaBadge({ status, className }: NdaBadgeProps) {
  const config = NDA_STATUS_CONFIG[status];
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
