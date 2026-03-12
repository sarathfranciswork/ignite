"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  ArrowLeft,
  FolderKanban,
  Trash2,
  Users,
  Lightbulb,
  Workflow,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useState } from "react";

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

const roleLabels: Record<string, string> = {
  LEADER: "Leader",
  MEMBER: "Member",
  GATEKEEPER: "Gatekeeper",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [showProcess, setShowProcess] = useState(false);

  const projectQuery = trpc.project.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      utils.project.list.invalidate();
      router.push("/projects");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load project.</p>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <FolderKanban className="h-7 w-7 text-primary-600" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-gray-900">{project.title}</h1>
              <Badge className={statusColorMap[project.status] ?? "bg-gray-100 text-gray-700"}>
                {statusLabelMap[project.status] ?? project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-1 text-sm text-gray-500">{project.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => deleteMutation.mutate({ id })}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Process definition */}
          <Card className="p-5">
            <button
              onClick={() => setShowProcess(!showProcess)}
              className="flex w-full items-center justify-between text-left"
              type="button"
            >
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary-600" />
                <h2 className="font-display text-lg font-semibold text-gray-900">
                  Process: {project.processDefinition.name}
                </h2>
              </div>
              {showProcess ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {project.currentPhase && (
              <p className="mt-2 text-sm text-gray-500">
                Current phase:{" "}
                <span className="font-medium text-gray-700">{project.currentPhase.name}</span>
              </p>
            )}
            {showProcess && (
              <div className="mt-4 space-y-2">
                {project.processDefinition.phases.map((phase, i) => (
                  <div
                    key={phase.id}
                    className={`rounded-lg border p-3 ${
                      project.currentPhase?.id === phase.id
                        ? "border-primary-300 bg-primary-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {i + 1}
                      </Badge>
                      <span className="text-sm font-medium text-gray-700">{phase.name}</span>
                      {phase.plannedDurationDays && (
                        <span className="text-xs text-gray-400">
                          ({phase.plannedDurationDays}d)
                        </span>
                      )}
                      {project.currentPhase?.id === phase.id && (
                        <Badge className="ml-auto bg-primary-100 text-primary-700">Current</Badge>
                      )}
                    </div>
                    {phase.activities.length > 0 && (
                      <div className="mt-2 pl-8 text-xs text-gray-500">
                        {phase.activities.map((a) => a.name).join(" / ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Source idea */}
          {project.sourceIdea && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <h2 className="font-display text-lg font-semibold text-gray-900">Source Idea</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{project.sourceIdea.title}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Team members */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <h2 className="font-display text-base font-semibold text-gray-900">Team</h2>
              </div>
              <span className="text-sm text-gray-400">{project.teamMembers.length} members</span>
            </div>
            {project.teamMembers.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No team members assigned yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {project.teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <span className="text-xs">
                          {(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
                        </span>
                      </Avatar>
                      <span className="text-sm text-gray-700">
                        {member.user.name ?? member.user.email}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {roleLabels[member.role] ?? member.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Info */}
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold text-gray-900">Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Created by</dt>
                <dd className="text-gray-700">
                  {project.createdBy.name ?? project.createdBy.email}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-700">
                  {new Date(project.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Updated</dt>
                <dd className="text-gray-700">
                  {new Date(project.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
