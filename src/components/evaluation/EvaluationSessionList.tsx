"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BarChart3, Clock, Users, Lightbulb, Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

interface EvaluationSessionListProps {
  campaignId: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ARCHIVED: "bg-yellow-100 text-yellow-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export function EvaluationSessionList({ campaignId }: EvaluationSessionListProps) {
  const sessionsQuery = trpc.evaluation.list.useQuery({
    campaignId,
    isTemplate: false,
  });

  const sendRemindersMutation = trpc.evaluation.sendReminders.useMutation({
    onSuccess: (data) => {
      if (data.sent > 0) {
        void sessionsQuery.refetch();
      }
    },
  });

  if (sessionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (sessionsQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load evaluation sessions.</p>
      </div>
    );
  }

  const sessions = sessionsQuery.data?.items ?? [];

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Evaluation Sessions</h3>
        <p className="mt-2 text-sm text-gray-500">
          Create an evaluation session to start scoring ideas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Evaluation Sessions</h2>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="truncate text-sm font-semibold text-gray-900">{session.title}</h3>
                  <Badge className={STATUS_COLORS[session.status] ?? "bg-gray-100 text-gray-700"}>
                    {STATUS_LABELS[session.status] ?? session.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {session.type === "SCORECARD" ? "Scorecard" : "Pairwise"}
                  </Badge>
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="h-3.5 w-3.5" />
                    {session.ideaCount} ideas
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {session.evaluatorCount} evaluators
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {session.responseCount} responses
                  </span>
                  {session.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Due {format(new Date(session.dueDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {session.status === "ACTIVE" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendRemindersMutation.mutate({ sessionId: session.id })}
                      disabled={sendRemindersMutation.isPending}
                    >
                      <Bell className="mr-1.5 h-3.5 w-3.5" />
                      Remind
                    </Button>
                    <Link href={`/campaigns/${campaignId}/evaluate/${session.id}`}>
                      <Button size="sm">
                        <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                        Evaluate
                      </Button>
                    </Link>
                  </>
                )}
                {session.status === "COMPLETED" && (
                  <Link href={`/campaigns/${campaignId}/evaluate/${session.id}`}>
                    <Button variant="outline" size="sm">
                      View Results
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
