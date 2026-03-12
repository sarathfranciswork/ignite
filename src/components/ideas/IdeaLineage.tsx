"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  ClipboardCheck,
  Lightbulb,
  FolderKanban,
  ChevronRight,
  GitBranch,
} from "lucide-react";

interface IdeaLineageProps {
  ideaId: string;
}

const typeIcons: Record<string, React.ElementType> = {
  campaign: Megaphone,
  evaluation: ClipboardCheck,
  concept: Lightbulb,
  project: FolderKanban,
};

const typeLabels: Record<string, string> = {
  campaign: "Campaign",
  evaluation: "Evaluation",
  concept: "Concept",
  project: "Project",
};

const typeColors: Record<string, string> = {
  campaign: "bg-blue-50 text-blue-700 border-blue-200",
  evaluation: "bg-purple-50 text-purple-700 border-purple-200",
  concept: "bg-amber-50 text-amber-700 border-amber-200",
  project: "bg-green-50 text-green-700 border-green-200",
};

export function IdeaLineage({ ideaId }: IdeaLineageProps) {
  const lineageQuery = trpc.project.ideaLineage.useQuery({ ideaId });

  if (lineageQuery.isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-gray-400" />
          <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 w-40 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </Card>
    );
  }

  if (lineageQuery.isError || !lineageQuery.data) {
    return null;
  }

  const { nodes } = lineageQuery.data;

  if (nodes.length === 0) {
    return null;
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-primary-600" />
        <h2 className="font-display text-lg font-semibold text-gray-900">Lineage</h2>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {nodes.map((node, i) => {
          const Icon = typeIcons[node.type] ?? FolderKanban;
          const colorClass = typeColors[node.type] ?? "bg-gray-50 text-gray-700 border-gray-200";

          return (
            <div key={`${node.type}-${node.id}`} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />}
              <Link
                href={node.url}
                className={`flex items-center gap-2 rounded-lg border p-3 transition-colors hover:shadow-sm ${colorClass}`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                    {typeLabels[node.type] ?? node.type}
                  </p>
                  <p className="truncate text-sm font-medium">{node.title}</p>
                </div>
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {node.status.replace(/_/g, " ")}
                </Badge>
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
