"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Share2,
  Building2,
  GripVertical,
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  MoreVertical,
} from "lucide-react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

// ── Types ────────────────────────────────────────────────────

interface OrgCardData {
  id: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    industry: string | null;
    location: string | null;
    fundingStage: string | null;
    relationshipStatus: string;
    websiteUrl: string | null;
  };
  notes: string | null;
  sortOrder: number;
  isArchived: boolean;
  customValues: Record<string, unknown> | null;
  addedAt: string;
}

// ── Sortable Card Component ──────────────────────────────────

function SortableOrgCard({
  card,
  onArchive,
  onRemove,
}: {
  card: OrgCardData;
  onArchive: (id: string, isArchived: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab text-gray-300 hover:text-gray-400 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {card.organization.logoUrl ? (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-100">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
              </div>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gray-100">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />
              </div>
            )}
            <Link
              href={`/partners/${card.organizationId}`}
              className="line-clamp-1 text-sm font-medium text-gray-900 hover:text-primary-600"
            >
              {card.organization.name}
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {card.organization.industry && (
              <Badge variant="secondary" className="text-[10px]">
                {card.organization.industry}
              </Badge>
            )}
            {card.organization.location && (
              <Badge variant="outline" className="text-[10px]">
                {card.organization.location}
              </Badge>
            )}
          </div>
          {card.notes && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{card.notes}</p>}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-500 group-hover:opacity-100"
            aria-label="Card actions"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 z-20 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onArchive(card.id, !card.isArchived);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50"
              >
                {card.isArchived ? (
                  <>
                    <ArchiveRestore className="h-3 w-3" /> Reactivate
                  </>
                ) : (
                  <>
                    <Archive className="h-3 w-3" /> Archive
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onRemove(card.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Organization Dialog ──────────────────────────────────

function AddOrgDialog({
  open,
  onOpenChange,
  boardId,
  columnId,
  existingOrgIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columnId: string;
  existingOrgIds: Set<string>;
}) {
  const [search, setSearch] = React.useState("");
  const utils = trpc.useUtils();

  const orgsQuery = trpc.organization.list.useQuery(
    { limit: 20, search: search || undefined },
    { enabled: open },
  );

  const addCardMutation = trpc.scoutingBoard.addCard.useMutation({
    onSuccess: () => {
      void utils.scoutingBoard.getById.invalidate({ id: boardId });
      onOpenChange(false);
      setSearch("");
    },
  });

  function handleAdd(orgId: string) {
    addCardMutation.mutate({
      boardId,
      columnId,
      organizationId: orgId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {orgsQuery.isLoading && (
              <p className="py-4 text-center text-sm text-gray-500">Loading...</p>
            )}
            {orgsQuery.data?.items.map((org) => {
              const isOnBoard = existingOrgIds.has(org.id);
              return (
                <button
                  key={org.id}
                  onClick={() => handleAdd(org.id)}
                  disabled={isOnBoard || addCardMutation.isPending}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium text-gray-900">{org.name}</p>
                    <p className="text-xs text-gray-500">
                      {[org.industry, org.location].filter(Boolean).join(" - ") || "No details"}
                    </p>
                  </div>
                  {isOnBoard && (
                    <Badge variant="secondary" className="text-[10px]">
                      Already added
                    </Badge>
                  )}
                </button>
              );
            })}
            {orgsQuery.data?.items.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">No organizations found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Share Dialog ─────────────────────────────────────────────

function ShareDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">
          Share this board with colleagues to collaborate on partner scouting.
        </p>
        <div className="mt-2 text-xs text-gray-400">
          Sharing functionality requires user search which will be available in a future update.
          Currently shared users can be managed via the API.
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Board Page ──────────────────────────────────────────

export default function ScoutingBoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const utils = trpc.useUtils();

  const boardQuery = trpc.scoutingBoard.getById.useQuery({ id: boardId });

  const moveCardMutation = trpc.scoutingBoard.moveCard.useMutation({
    onSuccess: () => {
      void utils.scoutingBoard.getById.invalidate({ id: boardId });
    },
  });

  const archiveCardMutation = trpc.scoutingBoard.archiveCard.useMutation({
    onSuccess: () => {
      void utils.scoutingBoard.getById.invalidate({ id: boardId });
    },
  });

  const removeCardMutation = trpc.scoutingBoard.removeCard.useMutation({
    onSuccess: () => {
      void utils.scoutingBoard.getById.invalidate({ id: boardId });
    },
  });

  const [addOrgColumnId, setAddOrgColumnId] = React.useState<string | null>(null);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const board = boardQuery.data;

  const existingOrgIds = React.useMemo(() => {
    if (!board) return new Set<string>();
    const ids = new Set<string>();
    for (const col of board.columns) {
      for (const card of col.cards) {
        ids.add(card.organizationId);
      }
    }
    return ids;
  }, [board]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const activeCardId = active.id as string;
    const overContainerId = over.id as string;

    let targetColumnId: string | undefined;
    let targetSortOrder = 0;

    for (const col of board.columns) {
      if (col.id === overContainerId) {
        targetColumnId = col.id;
        targetSortOrder = col.cards.length;
        break;
      }
      const cardInCol = col.cards.find((c) => c.id === overContainerId);
      if (cardInCol) {
        targetColumnId = col.id;
        targetSortOrder = cardInCol.sortOrder;
        break;
      }
    }

    if (!targetColumnId) return;

    moveCardMutation.mutate({
      id: activeCardId,
      columnId: targetColumnId,
      sortOrder: targetSortOrder,
    });
  }

  if (boardQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-96 w-72 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">Failed to load board. Please try again.</p>
        <Link href="/partners/scouting" className="mt-2 inline-block">
          <Button variant="outline" size="sm">
            Back to Boards
          </Button>
        </Link>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/partners/scouting">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Boards
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{board.title}</h1>
            {board.description && <p className="text-sm text-gray-500">{board.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="mr-1 h-4 w-4" />
            {showArchived ? "Hide Archived" : "Show Archived"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Board Columns */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((column) => {
            const visibleCards = showArchived
              ? column.cards
              : column.cards.filter((c) => !c.isArchived);

            return (
              <div
                key={column.id}
                className="w-72 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {column.color && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                    )}
                    <h3 className="text-sm font-semibold text-gray-700">{column.name}</h3>
                    <span className="text-xs text-gray-400">{visibleCards.length}</span>
                  </div>
                  <button
                    onClick={() => setAddOrgColumnId(column.id)}
                    className="rounded p-1 text-gray-400 hover:text-primary-600"
                    aria-label={`Add organization to ${column.name}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Cards */}
                <SortableContext
                  items={visibleCards.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="min-h-[100px] space-y-2 p-2">
                    {visibleCards.map((card) => (
                      <SortableOrgCard
                        key={card.id}
                        card={card}
                        onArchive={(id, isArchived) =>
                          archiveCardMutation.mutate({ id, isArchived })
                        }
                        onRemove={(id) => removeCardMutation.mutate({ id })}
                      />
                    ))}
                    {visibleCards.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-xs text-gray-400">No organizations</p>
                        <button
                          onClick={() => setAddOrgColumnId(column.id)}
                          className="mt-1 text-xs text-primary-600 hover:underline"
                        >
                          Add one
                        </button>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      {/* Dialogs */}
      {addOrgColumnId && (
        <AddOrgDialog
          open={!!addOrgColumnId}
          onOpenChange={(open) => !open && setAddOrgColumnId(null)}
          boardId={boardId}
          columnId={addOrgColumnId}
          existingOrgIds={existingOrgIds}
        />
      )}

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
