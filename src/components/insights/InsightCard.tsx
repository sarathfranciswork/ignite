"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, User } from "lucide-react";

interface InsightCardProps {
  insight: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    scope: string;
    isArchived: boolean;
    isEditorial: boolean;
    trendCount: number;
    createdBy: { id: string; name: string | null; email: string };
    createdAt: string;
  };
  onClick: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  SIGNAL: "bg-blue-100 text-blue-700",
  OBSERVATION: "bg-green-100 text-green-700",
  OPPORTUNITY: "bg-purple-100 text-purple-700",
  RISK: "bg-red-100 text-red-700",
};

const TYPE_LABELS: Record<string, string> = {
  SIGNAL: "Signal",
  OBSERVATION: "Observation",
  OPPORTUNITY: "Opportunity",
  RISK: "Risk",
};

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "Global",
  CAMPAIGN: "Campaign",
  TREND: "Trend",
};

export function InsightCard({ insight, onClick }: InsightCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(insight.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{insight.title}</h3>
          <div className="flex flex-shrink-0 items-center gap-1">
            <Badge className={TYPE_COLORS[insight.type] ?? ""}>
              {TYPE_LABELS[insight.type] ?? insight.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {insight.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-500">{insight.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {insight.isArchived && <Badge variant="secondary">Archived</Badge>}
          {insight.isEditorial && (
            <Badge variant="outline" className="text-amber-600">
              Editorial
            </Badge>
          )}
          <Badge variant="outline" className="text-gray-500">
            {SCOPE_LABELS[insight.scope] ?? insight.scope}
          </Badge>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
          {insight.trendCount > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {insight.trendCount} {insight.trendCount === 1 ? "trend" : "trends"}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {insight.createdBy.name ?? insight.createdBy.email}
          </span>
          <span>
            {new Date(insight.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
