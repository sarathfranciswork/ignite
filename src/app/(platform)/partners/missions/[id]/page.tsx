"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Target,
  Calendar,
  Users,
  ExternalLink,
  MapPin,
  Factory,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { format, isPast } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const NEXT_STATUS_MAP: Record<string, { label: string; status: string }> = {
  OPEN: { label: "Start Scouting", status: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Mark Complete", status: "COMPLETED" },
};

export default function ScoutingMissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;
  const utils = trpc.useUtils();

  const missionQuery = trpc.scoutingMission.getById.useQuery({ id: missionId });

  const transitionMutation = trpc.scoutingMission.transition.useMutation({
    onSuccess: () => {
      void utils.scoutingMission.getById.invalidate({ id: missionId });
    },
  });

  const deleteMutation = trpc.scoutingMission.delete.useMutation({
    onSuccess: () => {
      router.push("/partners/missions");
    },
  });

  if (missionQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  if (missionQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load mission. Please try again.</p>
      </div>
    );
  }

  const mission = missionQuery.data;
  if (!mission) return null;

  const requirements = mission.requirements as
    | { label: string; description?: string; priority: string }[]
    | null;

  const nextAction = NEXT_STATUS_MAP[mission.status];
  const isOverdue =
    mission.deadline && isPast(new Date(mission.deadline)) && mission.status !== "COMPLETED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/partners/missions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary-600" />
              <h1 className="font-display text-2xl font-bold text-gray-900">{mission.title}</h1>
            </div>
            <Badge className={`mt-1 text-xs ${STATUS_COLORS[mission.status] ?? ""}`}>
              {STATUS_LABELS[mission.status] ?? mission.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nextAction && (
            <Button
              onClick={() =>
                transitionMutation.mutate({
                  id: missionId,
                  targetStatus: nextAction.status as "OPEN" | "IN_PROGRESS" | "COMPLETED",
                })
              }
              disabled={transitionMutation.isPending}
            >
              {nextAction.label}
            </Button>
          )}
          {mission.status === "COMPLETED" && (
            <Button
              variant="outline"
              onClick={() => transitionMutation.mutate({ id: missionId, targetStatus: "OPEN" })}
              disabled={transitionMutation.isPending}
            >
              Reopen
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate({ id: missionId })}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Problem Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {mission.problemStatement}
              </p>
            </CardContent>
          </Card>

          {requirements && requirements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requirements.map((req, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
                    >
                      {req.priority === "MUST_HAVE" ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                      ) : (
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{req.label}</p>
                        {req.description && (
                          <p className="mt-1 text-xs text-gray-500">{req.description}</p>
                        )}
                        <Badge variant="outline" className="mt-1 text-xs">
                          {req.priority === "MUST_HAVE" ? "Must Have" : "Nice to Have"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {mission.board && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Linked Scouting Board</span>
                  <Link href={`/partners/scouting/${mission.board.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Open Board
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary-50 p-3">
                    <Target className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{mission.board.title}</p>
                    <p className="text-sm text-gray-500">
                      {mission.board.cardCount} organization
                      {mission.board.cardCount !== 1 ? "s" : ""} found
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mission.deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className={isOverdue ? "font-medium text-red-600" : "text-gray-700"}>
                    {isOverdue && <Clock className="mr-1 inline h-3.5 w-3.5" />}
                    {format(new Date(mission.deadline), "MMM d, yyyy")}
                    {isOverdue && " (overdue)"}
                  </span>
                </div>
              )}

              {mission.targetIndustries.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
                    <Factory className="h-4 w-4" />
                    <span>Target Industries</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mission.targetIndustries.map((ind) => (
                      <Badge key={ind} variant="secondary" className="text-xs">
                        {ind}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {mission.targetRegions.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span>Target Regions</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {mission.targetRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <p className="mb-1 text-xs text-gray-400">Created by</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {mission.createdBy.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-700">
                    {mission.createdBy.name ?? mission.createdBy.email}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {format(new Date(mission.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assigned Scouts ({mission.scouts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mission.scouts.length === 0 ? (
                <p className="text-sm text-gray-500">No scouts assigned yet.</p>
              ) : (
                <div className="space-y-2">
                  {mission.scouts.map((scout) => (
                    <div key={scout.id} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {scout.user.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {scout.user.name ?? scout.user.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          Assigned {format(new Date(scout.assignedAt), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
