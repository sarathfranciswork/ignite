"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, Layers, Clock } from "lucide-react";

interface ProcessTemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string | null;
    phaseCount: number;
    projectCount: number;
    createdBy: { id: string; name: string | null; email: string };
    createdAt: string;
  };
  onClick: (id: string) => void;
}

export function ProcessTemplateCard({ template, onClick }: ProcessTemplateCardProps) {
  return (
    <Card
      className="cursor-pointer p-5 transition-shadow hover:shadow-md"
      onClick={() => onClick(template.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
            <Workflow className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-gray-900">{template.name}</h3>
            {template.description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{template.description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" />
          <span>{template.phaseCount} phases</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{template.projectCount} projects</span>
        </div>
      </div>
      {template.projectCount > 0 && (
        <Badge variant="secondary" className="mt-3">
          In use
        </Badge>
      )}
    </Card>
  );
}
