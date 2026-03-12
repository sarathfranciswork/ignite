"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

interface SplitIdeaDialogProps {
  ideaId: string;
  ideaTitle: string;
  ideaDescription: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SplitEntry {
  title: string;
  description: string;
}

export function SplitIdeaDialog({
  ideaId,
  ideaTitle,
  ideaDescription,
  open,
  onOpenChange,
  onSuccess,
}: SplitIdeaDialogProps) {
  const [entries, setEntries] = React.useState<SplitEntry[]>([
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [error, setError] = React.useState<string | null>(null);

  const splitMutation = trpc.idea.split.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      resetForm();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function resetForm() {
    setEntries([
      { title: "", description: "" },
      { title: "", description: "" },
    ]);
    setError(null);
  }

  function updateEntry(index: number, field: keyof SplitEntry, value: string) {
    setEntries((prev) => {
      const next = [...prev];
      const entry = next[index];
      if (entry) {
        next[index] = { ...entry, [field]: value };
      }
      return next;
    });
  }

  function addEntry() {
    if (entries.length < 5) {
      setEntries((prev) => [...prev, { title: "", description: "" }]);
    }
  }

  function removeEntry(index: number) {
    if (entries.length > 2) {
      setEntries((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validEntries = entries.filter((e) => e.title.trim());
    if (validEntries.length < 2) {
      setError("Must provide at least 2 ideas with titles");
      return;
    }

    splitMutation.mutate({
      id: ideaId,
      newIdeas: validEntries.map((e) => ({
        title: e.title.trim(),
        description: e.description.trim() || undefined,
      })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Split Idea</DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-700">Splitting: {ideaTitle}</p>
          {ideaDescription && <p className="mt-1 line-clamp-2 text-gray-500">{ideaDescription}</p>}
          <p className="mt-2 text-xs text-gray-400">
            The original idea will be archived. Contributors and co-authors will be preserved on all
            new ideas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {entries.map((entry, index) => (
            <div key={index} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">New Idea {index + 1}</span>
                {entries.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEntry(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor={`split-title-${index}`}>Title *</Label>
                  <Input
                    id={`split-title-${index}`}
                    value={entry.title}
                    onChange={(e) => updateEntry(index, "title", e.target.value)}
                    placeholder="Idea title"
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label htmlFor={`split-desc-${index}`}>Description</Label>
                  <Textarea
                    id={`split-desc-${index}`}
                    value={entry.description}
                    onChange={(e) => updateEntry(index, "description", e.target.value)}
                    placeholder="Describe this portion of the idea..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          ))}

          {entries.length < 5 && (
            <Button type="button" variant="outline" size="sm" onClick={addEntry} className="w-full">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Another Idea
            </Button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={splitMutation.isPending}>
              {splitMutation.isPending ? "Splitting..." : "Split Idea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
