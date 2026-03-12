"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Lightbulb, Lock } from "lucide-react";

interface TrendCardProps {
  trend: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    isArchived: boolean;
    isConfidential: boolean;
    isCommunitySubmitted: boolean;
    businessRelevance: number | null;
    childCount: number;
    siaCount: number;
    insightCount: number;
    createdAt: string;
  };
  onClick: (id: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  MEGA: "bg-purple-100 text-purple-700",
  MACRO: "bg-blue-100 text-blue-700",
  MICRO: "bg-green-100 text-green-700",
};

export function TrendCard({ trend, onClick }: TrendCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(trend.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{trend.title}</h3>
          <div className="flex flex-shrink-0 items-center gap-1">
            {trend.isConfidential && <Lock className="h-3.5 w-3.5 text-amber-500" />}
            <Badge className={TYPE_COLORS[trend.type] ?? ""}>{trend.type}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trend.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-500">{trend.description}</p>
        )}
        {trend.isArchived && (
          <Badge variant="secondary" className="mb-3">
            Archived
          </Badge>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {trend.childCount > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {trend.childCount} sub-trends
            </span>
          )}
          {trend.siaCount > 0 && (
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {trend.siaCount} {trend.siaCount === 1 ? "SIA" : "SIAs"}
            </span>
          )}
          {trend.insightCount > 0 && (
            <span className="flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" />
              {trend.insightCount} {trend.insightCount === 1 ? "insight" : "insights"}
            </span>
          )}
          {trend.businessRelevance !== null && (
            <span className="text-xs">Relevance: {trend.businessRelevance.toFixed(1)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
