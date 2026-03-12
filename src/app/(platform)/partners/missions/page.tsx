"use client";

import * as React from "react";
import Link from "next/link";
import { Target, Plus, Search, Users, Calendar, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

export default function ScoutingMissionsPage() {
  const [search, setSearch] = React.useState("");
  const utils = trpc.useUtils();

  const missionsQuery = trpc.scoutingMission.list.useQuery({
    limit: 20,
    search: search || undefined,
  });

  const deleteMutation = trpc.scoutingMission.delete.useMutation({
    onSuccess: () => {
      void utils.scoutingMission.list.invalidate();
    },
  });

  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  function handleDelete(missionId: string) {
    setMenuOpenId(null);
    deleteMutation.mutate({ id: missionId });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Scouting Missions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create structured scouting requests to find partners for specific problems.
          </p>
        </div>
        <Link href="/partners/missions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Mission
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search missions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {missionsQuery.isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {missionsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load missions. Please try again.</p>
        </div>
      )}

      {missionsQuery.data && missionsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Target className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No scouting missions yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? "Try adjusting your search."
              : "Create your first scouting mission to start finding partners."}
          </p>
          {!search && (
            <Link href="/partners/missions/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Mission
              </Button>
            </Link>
          )}
        </div>
      )}

      {missionsQuery.data && missionsQuery.data.items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {missionsQuery.data.items.map((mission) => (
            <Card key={mission.id} className="group relative transition-shadow hover:shadow-md">
              <div className="absolute right-2 top-2 z-10">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpenId(menuOpenId === mission.id ? null : mission.id);
                  }}
                  className="rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
                  aria-label="Mission actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpenId === mission.id && (
                  <div className="absolute right-0 top-8 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => handleDelete(mission.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <Link href={`/partners/missions/${mission.id}`}>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary-600" />
                    <h3 className="line-clamp-1 font-semibold text-gray-900">{mission.title}</h3>
                  </div>
                  <Badge className={`mb-3 text-xs ${STATUS_COLORS[mission.status] ?? ""}`}>
                    {STATUS_LABELS[mission.status] ?? mission.status}
                  </Badge>
                  <p className="mb-3 line-clamp-2 text-sm text-gray-500">
                    {mission.problemStatement}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {mission.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span
                          className={
                            isPast(new Date(mission.deadline)) && mission.status !== "COMPLETED"
                              ? "text-red-500"
                              : ""
                          }
                        >
                          {format(new Date(mission.deadline), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    {mission.scoutCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>
                          {mission.scoutCount} scout{mission.scoutCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {mission.board && (
                      <Badge variant="outline" className="text-xs">
                        {mission.board.cardCount} org
                        {mission.board.cardCount !== 1 ? "s" : ""} found
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {mission.createdBy.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-400">
                      {mission.createdBy.name ?? mission.createdBy.email}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(mission.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
