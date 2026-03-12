"use client";

import * as React from "react";
import { Users, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EvaluationProgressProps {
  sessionId: string;
}

export function EvaluationProgress({ sessionId }: EvaluationProgressProps) {
  const progressQuery = trpc.evaluation.progress.useQuery(
    { sessionId },
    { refetchInterval: 30_000 },
  );

  if (progressQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-xl bg-gray-100" />;
  }

  if (progressQuery.isError || !progressQuery.data) {
    return null;
  }

  const { evaluatorProgress, overall } = progressQuery.data;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Users className="h-4 w-4" />
          Evaluator Progress
        </h3>
        <span className="text-xs font-medium text-gray-500">
          Overall: {overall.percentage}% ({overall.completed}/{overall.total})
        </span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-primary-600 transition-all"
          style={{ width: `${overall.percentage}%` }}
        />
      </div>

      <div className="mt-4 space-y-3">
        {evaluatorProgress.map((ep) => (
          <div key={ep.userId} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">Evaluator {ep.userId.slice(-6)}</span>
                <span className="text-gray-500">
                  {ep.completed}/{ep.total}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    ep.percentage === 100 ? "bg-green-500" : "bg-primary-400"
                  }`}
                  style={{ width: `${ep.percentage}%` }}
                />
              </div>
            </div>
            {ep.percentage === 100 && (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
