"use client";

import Link from "next/link";
import { Building2, Users, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UseCaseStatusBadge } from "./UseCaseStatusBadge";

interface UseCaseCardProps {
  useCase: {
    id: string;
    title: string;
    problemDescription: string | null;
    status: "IDENTIFIED" | "QUALIFICATION" | "EVALUATION" | "PILOT" | "PARTNERSHIP" | "ARCHIVED";
    owner: { id: string; name: string | null; email: string };
    organizations: Array<{
      id: string;
      organization: { id: string; name: string };
    }>;
    teamMembers: Array<{
      id: string;
      user: { id: string; name: string | null };
    }>;
    taskCount: number;
  };
}

export function UseCaseCard({ useCase }: UseCaseCardProps) {
  return (
    <Link href={`/partners/use-cases/${useCase.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base">{useCase.title}</CardTitle>
            <UseCaseStatusBadge status={useCase.status} />
          </div>
        </CardHeader>
        <CardContent>
          {useCase.problemDescription && (
            <p className="mb-3 line-clamp-2 text-sm text-gray-600">{useCase.problemDescription}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {useCase.organizations.length > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {useCase.organizations.length} org
                {useCase.organizations.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {useCase.teamMembers.length} member
              {useCase.teamMembers.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" />
              {useCase.taskCount} task{useCase.taskCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-2 text-xs text-gray-400">
            Owner: {useCase.owner.name ?? useCase.owner.email}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
