"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Workflow,
  Trash2,
  Copy,
  GripVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  KEYWORD: "Keyword",
  ATTACHMENT: "Attachment",
  DATE: "Date",
  USER: "User",
};

export default function ProcessTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const templateQuery = trpc.processDefinition.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const deleteMutation = trpc.processDefinition.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.processDefinition.list.invalidate();
      router.push("/projects/templates");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const duplicateMutation = trpc.processDefinition.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Template duplicated");
      utils.processDefinition.list.invalidate();
      if (data) {
        router.push(`/projects/templates/${data.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  if (templateQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (templateQuery.isError || !templateQuery.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load template.</p>
        <Link href="/projects/templates">
          <Button variant="outline" className="mt-4">
            Back to Templates
          </Button>
        </Link>
      </div>
    );
  }

  const template = templateQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects/templates" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Workflow className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">{template.name}</h1>
            {template.description && (
              <p className="text-sm text-gray-500">{template.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => duplicateMutation.mutate({ id })}
            disabled={duplicateMutation.isPending}
          >
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              if (template.projectCount > 0) {
                toast.error("Cannot delete a template that has active projects");
                return;
              }
              deleteMutation.mutate({ id });
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>{template.phases.length} phases</span>
        <span>{template.projectCount} projects using this template</span>
      </div>

      {template.phases.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">
            This template has no phases yet. Phases can be added via the API.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {template.phases.map((phase, phaseIndex) => {
            const isExpanded = expandedPhases.has(phase.id);

            return (
              <Card key={phase.id} className="overflow-hidden">
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50"
                  type="button"
                >
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <Badge variant="outline" className="shrink-0">
                    Phase {phaseIndex + 1}
                  </Badge>
                  <span className="font-medium text-gray-900">{phase.name}</span>
                  {phase.plannedDurationDays && (
                    <span className="text-sm text-gray-400">
                      ({phase.plannedDurationDays} days)
                    </span>
                  )}
                  <span className="ml-auto text-sm text-gray-400">
                    {phase.activities.length} activities
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                </button>

                {isExpanded && phase.activities.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="space-y-3">
                      {phase.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">
                              {activity.name}
                            </span>
                            {activity.isMandatory && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          {activity.description && (
                            <p className="mt-1 text-xs text-gray-500">{activity.description}</p>
                          )}
                          {activity.tasks.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {activity.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-xs"
                                >
                                  <span className="text-gray-600">{task.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {FIELD_TYPE_LABELS[task.fieldType] ?? task.fieldType}
                                  </Badge>
                                  {task.isMandatory && <span className="text-red-500">*</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
