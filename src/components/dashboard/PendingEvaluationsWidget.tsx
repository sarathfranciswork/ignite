"use client";

import { ClipboardCheck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface PendingEvaluation {
  sessionId: string;
  sessionTitle: string;
  sessionType: string;
  campaignId: string;
  campaignTitle: string;
  dueDate: string | null;
  ideaCount: number;
  respondedCount: number;
}

interface PendingEvaluationsWidgetProps {
  evaluations: PendingEvaluation[];
}

export function PendingEvaluationsWidget({ evaluations }: PendingEvaluationsWidgetProps) {
  if (evaluations.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ClipboardCheck className="h-4 w-4 text-primary-600" />
          Pending Evaluations
        </h3>
        <p className="mt-4 text-center text-sm text-gray-500">No pending evaluations</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ClipboardCheck className="h-4 w-4 text-primary-600" />
        Pending Evaluations
        <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
          {evaluations.length}
        </span>
      </h3>
      <div className="mt-4 space-y-3">
        {evaluations.map((evaluation) => {
          const progress =
            evaluation.ideaCount > 0
              ? Math.round((evaluation.respondedCount / evaluation.ideaCount) * 100)
              : 0;

          return (
            <Link
              key={evaluation.sessionId}
              href={`/campaigns/${evaluation.campaignId}`}
              className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {evaluation.sessionTitle}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {evaluation.campaignTitle}
                  </p>
                </div>
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {evaluation.sessionType === "SCORECARD" ? "Scorecard" : "Pairwise"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-primary-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {evaluation.respondedCount}/{evaluation.ideaCount}
                </span>
              </div>
              {evaluation.dueDate && (
                <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  Due {formatDistanceToNow(new Date(evaluation.dueDate), { addSuffix: true })}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
