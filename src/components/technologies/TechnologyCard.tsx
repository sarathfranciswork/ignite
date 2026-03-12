"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Lock, Megaphone, Lightbulb } from "lucide-react";

interface TechnologyCardProps {
  technology: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    maturity: string;
    isArchived: boolean;
    isConfidential: boolean;
    siaCount: number;
    campaignCount: number;
    ideaCount: number;
    createdAt: string;
  };
  onClick: (id: string) => void;
}

const MATURITY_COLORS: Record<string, string> = {
  EMERGING: "bg-cyan-100 text-cyan-700",
  GROWING: "bg-green-100 text-green-700",
  MATURE: "bg-blue-100 text-blue-700",
  DECLINING: "bg-orange-100 text-orange-700",
};

const MATURITY_LABELS: Record<string, string> = {
  EMERGING: "Emerging",
  GROWING: "Growing",
  MATURE: "Mature",
  DECLINING: "Declining",
};

const CATEGORY_LABELS: Record<string, string> = {
  AI_ML: "AI/ML",
  BLOCKCHAIN: "Blockchain",
  CLOUD: "Cloud",
  CYBERSECURITY: "Cybersecurity",
  DATA_ANALYTICS: "Data & Analytics",
  HARDWARE: "Hardware",
  IOT: "IoT",
  MOBILE: "Mobile",
  NETWORKING: "Networking",
  ROBOTICS: "Robotics",
  SOFTWARE: "Software",
  OTHER: "Other",
};

export function TechnologyCard({ technology, onClick }: TechnologyCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(technology.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-semibold leading-tight">{technology.title}</h3>
          <div className="flex flex-shrink-0 items-center gap-1">
            {technology.isConfidential && <Lock className="h-3.5 w-3.5 text-amber-500" />}
            {technology.maturity && (
              <Badge className={MATURITY_COLORS[technology.maturity] ?? ""}>
                {MATURITY_LABELS[technology.maturity] ?? technology.maturity}
              </Badge>
            )}
          </div>
        </div>
        {technology.category && technology.category !== "OTHER" && (
          <span className="text-xs text-gray-400">
            {CATEGORY_LABELS[technology.category] ?? technology.category}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {technology.description && (
          <p className="mb-3 line-clamp-2 text-sm text-gray-500">{technology.description}</p>
        )}
        {technology.isArchived && (
          <Badge variant="secondary" className="mb-3">
            Archived
          </Badge>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {technology.siaCount > 0 && (
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {technology.siaCount} {technology.siaCount === 1 ? "SIA" : "SIAs"}
            </span>
          )}
          {technology.campaignCount > 0 && (
            <span className="flex items-center gap-1">
              <Megaphone className="h-3.5 w-3.5" />
              {technology.campaignCount}
            </span>
          )}
          {technology.ideaCount > 0 && (
            <span className="flex items-center gap-1">
              <Lightbulb className="h-3.5 w-3.5" />
              {technology.ideaCount}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
