"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, X, GripVertical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

interface ColumnDef {
  id: string;
  name: string;
  color: string;
}

const DEFAULT_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#6b7280"];

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "1", name: "Long List", color: DEFAULT_COLORS[0] ?? "#6366f1" },
  { id: "2", name: "Evaluating", color: DEFAULT_COLORS[1] ?? "#f59e0b" },
  { id: "3", name: "Short List", color: DEFAULT_COLORS[2] ?? "#22c55e" },
  { id: "4", name: "Archived", color: DEFAULT_COLORS[3] ?? "#6b7280" },
];

let nextId = 5;

export default function NewScoutingBoardPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [columns, setColumns] = React.useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [error, setError] = React.useState<string | null>(null);

  const createMutation = trpc.scoutingBoard.create.useMutation({
    onSuccess: (board) => {
      router.push(`/partners/scouting/${board.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function addColumn() {
    const colorIndex = columns.length % DEFAULT_COLORS.length;
    setColumns([
      ...columns,
      {
        id: String(nextId++),
        name: "",
        color: DEFAULT_COLORS[colorIndex] ?? "#6366f1",
      },
    ]);
  }

  function removeColumn(id: string) {
    if (columns.length <= 1) return;
    setColumns(columns.filter((c) => c.id !== id));
  }

  function updateColumnName(id: string, name: string) {
    setColumns(columns.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const validColumns = columns.filter((c) => c.name.trim());
    if (validColumns.length === 0) {
      setError("At least one column with a name is required");
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      columns: validColumns.map((c) => ({ name: c.name.trim(), color: c.color })),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/partners/scouting">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </Link>
        <h1 className="font-display text-2xl font-bold text-gray-900">New Scouting Board</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Board Title</Label>
          <Input
            id="title"
            placeholder="e.g., AI Startups Q1 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe the purpose of this scouting board..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Columns</Label>
            <Button type="button" variant="outline" size="sm" onClick={addColumn}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Column
            </Button>
          </div>
          <div className="space-y-2">
            {columns.map((col, index) => (
              <div key={col.id} className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-300" />
                <div
                  className="h-6 w-6 flex-shrink-0 rounded"
                  style={{ backgroundColor: col.color }}
                />
                <Input
                  placeholder={`Column ${index + 1}`}
                  value={col.name}
                  onChange={(e) => updateColumnName(col.id, e.target.value)}
                  maxLength={100}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeColumn(col.id)}
                  className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  disabled={columns.length <= 1}
                  aria-label="Remove column"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/partners/scouting">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Board"}
          </Button>
        </div>
      </form>
    </div>
  );
}
