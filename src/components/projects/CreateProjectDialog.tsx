"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; description?: string; processDefinitionId: string }) => void;
  isLoading: boolean;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [processDefinitionId, setProcessDefinitionId] = useState("");

  const templatesQuery = trpc.processDefinition.list.useQuery({ limit: 100 }, { enabled: open });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !processDefinitionId) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      processDefinitionId,
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setTitle("");
      setDescription("");
      setProcessDefinitionId("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this project..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-template">Process Template</Label>
            <select
              id="project-template"
              value={processDefinitionId}
              onChange={(e) => setProcessDefinitionId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            >
              <option value="">Select a process template...</option>
              {templatesQuery.data?.items.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.phaseCount} phases)
                </option>
              ))}
            </select>
            {templatesQuery.data?.items.length === 0 && (
              <p className="text-xs text-gray-500">
                No process templates available. Create one first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !processDefinitionId || isLoading}>
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
