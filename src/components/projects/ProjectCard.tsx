"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, Users, Lightbulb } from "lucide-react";

const statusColorMap: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  TERMINATED: "bg-red-100 text-red-700",
};

const statusLabelMap: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
};

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    processDefinition: { id: string; name: string };
    currentPhase: { id: string; name: string } | null;
    createdBy: { id: string; name: string | null; email: string };
    sourceIdea: { id: string; title: string } | null;
    teamMemberCount: number;
    createdAt: string;
  };
  onClick: (id: string) => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card
      className="cursor-pointer p-5 transition-shadow hover:shadow-md"
      onClick={() => onClick(project.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
            <FolderKanban className="h-5 w-5 text-accent-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold text-gray-900">{project.title}</h3>
            <p className="mt-0.5 text-sm text-gray-500">{project.processDefinition.name}</p>
          </div>
        </div>
        <Badge className={statusColorMap[project.status] ?? "bg-gray-100 text-gray-700"}>
          {statusLabelMap[project.status] ?? project.status}
        </Badge>
      </div>

      {project.description && (
        <p className="mt-3 line-clamp-2 text-sm text-gray-500">{project.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        {project.currentPhase && (
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {project.currentPhase.name}
          </span>
        )}
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>{project.teamMemberCount}</span>
        </div>
        {project.sourceIdea && (
          <div className="flex items-center gap-1">
            <Lightbulb className="h-3.5 w-3.5" />
            <span className="truncate">{project.sourceIdea.title}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
