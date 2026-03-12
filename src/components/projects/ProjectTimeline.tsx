"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

interface PhaseData {
  id: string;
  name: string;
  position: number;
  status: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
}

interface TimelineProject {
  id: string;
  title: string;
  status: string;
  processDefinition: string;
  currentPhase: string | null;
  createdAt: string;
  phases: PhaseData[];
}

interface ProjectTimelineProps {
  projects: TimelineProject[];
}

const phaseStatusColors: Record<string, string> = {
  ELABORATION: "bg-blue-400",
  GATE_REVIEW: "bg-amber-400",
  COMPLETED: "bg-green-400",
  SKIPPED: "bg-gray-300",
};

const statusBadgeColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  TERMINATED: "bg-red-100 text-red-700",
};

export function ProjectTimeline({ projects }: ProjectTimelineProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary-600" />
        <h2 className="font-display text-lg font-semibold text-gray-900">Project Timeline</h2>
      </div>

      <div className="mt-4 space-y-3">
        {projects.slice(0, 20).map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block rounded-lg border border-gray-200 p-3 transition-colors hover:border-primary-200 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{project.title}</p>
                  <Badge
                    className={`text-[10px] ${statusBadgeColors[project.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {project.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{project.processDefinition}</p>
              </div>
              {project.currentPhase && (
                <span className="whitespace-nowrap text-xs text-gray-500">
                  {project.currentPhase}
                </span>
              )}
            </div>

            {project.phases.length > 0 && (
              <div className="mt-2 flex gap-0.5">
                {project.phases.map((phase) => {
                  const colorClass = phaseStatusColors[phase.status] ?? "bg-gray-200";
                  return (
                    <div
                      key={phase.id}
                      className={`h-2 flex-1 rounded-full ${colorClass}`}
                      title={`${phase.name}: ${phase.status}`}
                    />
                  );
                })}
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
          Elaboration
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          Gate Review
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
          Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
          Skipped
        </span>
      </div>
    </Card>
  );
}
