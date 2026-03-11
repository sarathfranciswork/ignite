"use client";

import * as React from "react";
import Link from "next/link";
import { Kanban, Plus, Search, Users, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";

export default function ScoutingBoardsPage() {
  const [search, setSearch] = React.useState("");
  const utils = trpc.useUtils();

  const boardsQuery = trpc.scoutingBoard.list.useQuery({
    limit: 20,
    search: search || undefined,
    includeShared: true,
  });

  const deleteMutation = trpc.scoutingBoard.delete.useMutation({
    onSuccess: () => {
      void utils.scoutingBoard.list.invalidate();
    },
  });

  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  function handleDelete(boardId: string) {
    setMenuOpenId(null);
    deleteMutation.mutate({ id: boardId });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Scouting Boards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create boards to discover and evaluate potential partners.
          </p>
        </div>
        <Link href="/partners/scouting/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search boards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {boardsQuery.isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      )}

      {boardsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">Failed to load boards. Please try again.</p>
        </div>
      )}

      {boardsQuery.data && boardsQuery.data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Kanban className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No scouting boards yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {search
              ? "Try adjusting your search."
              : "Create your first scouting board to start discovering partners."}
          </p>
          {!search && (
            <Link href="/partners/scouting/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Board
              </Button>
            </Link>
          )}
        </div>
      )}

      {boardsQuery.data && boardsQuery.data.items.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boardsQuery.data.items.map((board) => (
            <Card key={board.id} className="group relative transition-shadow hover:shadow-md">
              <div className="absolute right-2 top-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpenId(menuOpenId === board.id ? null : board.id);
                  }}
                  className="rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
                  aria-label="Board actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuOpenId === board.id && (
                  <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={() => handleDelete(board.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <Link href={`/partners/scouting/${board.id}`}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Kanban className="h-5 w-5 text-primary-600" />
                    <h3 className="line-clamp-1 font-semibold text-gray-900">{board.title}</h3>
                  </div>
                  {board.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-gray-500">{board.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <Badge variant="secondary" className="text-xs">
                      {board.cardCount} org{board.cardCount !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {board.columnCount} col{board.columnCount !== 1 ? "s" : ""}
                    </Badge>
                    {board.shares.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>Shared ({board.shares.length})</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {board.createdBy.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-400">
                      {board.createdBy.name ?? board.createdBy.email}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(board.updatedAt).toLocaleDateString()}
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
