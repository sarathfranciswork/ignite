"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Cpu, Lightbulb, X } from "lucide-react";

type EntityType = "TREND" | "TECHNOLOGY" | "IDEA" | "SIA";

interface PortfolioItemCardProps {
  item: {
    id: string;
    entityType: EntityType;
    entityId: string;
    entity: {
      title: string;
      description: string | null;
      metadata: Record<string, unknown>;
    } | null;
  };
  onRemove: (itemId: string) => void;
}

const ENTITY_CONFIG: Record<EntityType, { icon: React.ElementType; label: string; color: string }> =
  {
    SIA: { icon: Target, label: "SIA", color: "bg-indigo-100 text-indigo-700" },
    TREND: { icon: TrendingUp, label: "Trend", color: "bg-emerald-100 text-emerald-700" },
    TECHNOLOGY: { icon: Cpu, label: "Technology", color: "bg-amber-100 text-amber-700" },
    IDEA: { icon: Lightbulb, label: "Idea", color: "bg-blue-100 text-blue-700" },
  };

export function PortfolioItemCard({ item, onRemove }: PortfolioItemCardProps) {
  const config = ENTITY_CONFIG[item.entityType];
  const Icon = config.icon;

  if (!item.entity) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm text-red-600">Entity not found (may have been deleted)</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-6 text-xs text-red-500"
          onClick={() => onRemove(item.id)}
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="mb-2 flex items-center gap-2">
        <Badge className={`${config.color} text-xs`}>
          <Icon className="mr-1 h-3 w-3" />
          {config.label}
        </Badge>
      </div>

      <h4 className="text-sm font-medium text-gray-900">{item.entity.title}</h4>

      {item.entity.description && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.entity.description}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        {Object.entries(item.entity.metadata)
          .filter(
            ([key, value]) =>
              value !== null &&
              value !== undefined &&
              key !== "color" &&
              key !== "isArchived" &&
              key !== "isActive",
          )
          .slice(0, 3)
          .map(([key, value]) => (
            <span key={key} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {formatMetadataValue(key, value)}
            </span>
          ))}
      </div>
    </div>
  );
}

function formatMetadataValue(key: string, value: unknown): string {
  const label = key
    .replace(/([A-Z])/g, " $1")
    .replace(/Count$/, "")
    .trim();
  if (typeof value === "number") {
    return `${value} ${label.toLowerCase()}${value !== 1 ? "s" : ""}`;
  }
  return String(value);
}
