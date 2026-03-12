"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { BarChart3, Clock, Lightbulb, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export function EvaluatorDashboard() {
  const pendingQuery = trpc.evaluation.myPending.useQuery({ limit: 20 });

  if (pendingQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (pendingQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load pending evaluations.</p>
      </div>
    );
  }

  const items = pendingQuery.data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">All Caught Up</h3>
        <p className="mt-2 text-sm text-gray-500">You have no pending evaluations at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Pending Evaluations</h2>

      <div className="space-y-3">
        {items.map((session) => (
          <div
            key={session.id}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-gray-900">{session.title}</h3>
                <p className="mt-0.5 text-xs text-gray-500">Campaign: {session.campaignTitle}</p>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="h-3.5 w-3.5" />
                    {session.ideaCount} ideas
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {session.type === "SCORECARD" ? "Scorecard" : "Pairwise"}
                  </Badge>
                  {session.dueDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Due {format(new Date(session.dueDate), "MMM d, yyyy")}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 w-32 rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        session.myProgress.percentage === 100 ? "bg-green-500" : "bg-primary-600"
                      }`}
                      style={{ width: `${session.myProgress.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {session.myProgress.percentage}% complete
                  </span>
                </div>
              </div>

              <Link href={`/campaigns/${session.campaignId}/evaluate/${session.id}`}>
                <Button size="sm">
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                  {session.myProgress.percentage > 0 ? "Continue" : "Start"}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
