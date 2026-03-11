"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";

type UseCaseStatus = "IDENTIFIED" | "QUALIFICATION" | "EVALUATION" | "PILOT" | "PARTNERSHIP";

const PIPELINE_COLUMNS: { status: UseCaseStatus; label: string }[] = [
  { status: "IDENTIFIED", label: "Identified" },
  { status: "QUALIFICATION", label: "Qualification" },
  { status: "EVALUATION", label: "Evaluation" },
  { status: "PILOT", label: "Pilot" },
  { status: "PARTNERSHIP", label: "Partnership" },
];

export function UseCasePipelineBoard() {
  const useCasesQuery = trpc.useCase.list.useQuery({ limit: 100 });
  const useCases = useCasesQuery.data?.items ?? [];

  if (useCasesQuery.isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_COLUMNS.map((col) => (
          <div key={col.status} className="min-w-[250px] flex-1">
            <div className="mb-3 h-8 w-32 animate-pulse rounded bg-gray-100" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_COLUMNS.map((col) => {
        const columnItems = useCases.filter((uc) => uc.status === col.status);
        return (
          <div key={col.status} className="min-w-[250px] flex-1">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                  {columnItems.length}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              {columnItems.map((uc) => (
                <Link key={uc.id} href={`/partners/use-cases/${uc.id}`}>
                  <div className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
                    <p className="mb-1 line-clamp-2 text-sm font-medium text-gray-900">
                      {uc.title}
                    </p>
                    {uc.organizations.length > 0 && (
                      <p className="mb-2 text-xs text-gray-500">
                        {uc.organizations.map((o) => o.organization.name).join(", ")}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {uc.owner.name ?? uc.owner.email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {uc.taskCount} task{uc.taskCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {columnItems.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                  No use cases
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
