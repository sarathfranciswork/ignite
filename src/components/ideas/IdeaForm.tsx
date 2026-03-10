"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

interface IdeaFormProps {
  campaignId: string;
  idea?: {
    id: string;
    title: string;
    teaser: string | null;
    description: string | null;
    category: string | null;
    tags: string[];
    isConfidential: boolean;
    inventionDisclosure: boolean;
  };
  onSuccess?: () => void;
}

export function IdeaForm({ campaignId, idea, onSuccess }: IdeaFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEditing = !!idea;

  const [title, setTitle] = React.useState(idea?.title ?? "");
  const [teaser, setTeaser] = React.useState(idea?.teaser ?? "");
  const [description, setDescription] = React.useState(idea?.description ?? "");
  const [category, setCategory] = React.useState(idea?.category ?? "");
  const [tagsInput, setTagsInput] = React.useState(idea?.tags.join(", ") ?? "");
  const [isConfidential, setIsConfidential] = React.useState(idea?.isConfidential ?? false);
  const [inventionDisclosure, setInventionDisclosure] = React.useState(
    idea?.inventionDisclosure ?? false,
  );
  const [titleError, setTitleError] = React.useState<string | null>(null);

  const createMutation = trpc.idea.create.useMutation();
  React.useEffect(() => {
    if (createMutation.isSuccess && createMutation.data) {
      void utils.idea.list.invalidate({ campaignId });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/ideas/${createMutation.data.id}`);
      }
    }
  }, [createMutation.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = trpc.idea.update.useMutation();
  React.useEffect(() => {
    if (updateMutation.isSuccess && updateMutation.data) {
      void utils.idea.list.invalidate({ campaignId });
      void utils.idea.getById.invalidate({ id: updateMutation.data.id });
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [updateMutation.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitMutation = trpc.idea.submit.useMutation();
  React.useEffect(() => {
    if (submitMutation.isSuccess) {
      void utils.idea.list.invalidate({ campaignId });
      if (idea) {
        void utils.idea.getById.invalidate({ id: idea.id });
      }
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [submitMutation.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPending =
    createMutation.isPending || updateMutation.isPending || submitMutation.isPending;

  function parseTags(tagsStr: string): string[] {
    return tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  function validate(): boolean {
    if (!title.trim()) {
      setTitleError("Title is required");
      return false;
    }
    if (title.length > 200) {
      setTitleError("Title must be 200 characters or less");
      return false;
    }
    setTitleError(null);
    return true;
  }

  function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const tags = parseTags(tagsInput);

    if (isEditing) {
      updateMutation.mutate({
        id: idea.id,
        title,
        teaser: teaser || null,
        description: description || null,
        category: category || null,
        tags,
        isConfidential,
        inventionDisclosure,
      });
    } else {
      createMutation.mutate({
        campaignId,
        title,
        teaser: teaser || undefined,
        description: description || undefined,
        category: category || undefined,
        tags,
        isConfidential,
        inventionDisclosure,
        submitImmediately: false,
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const tags = parseTags(tagsInput);

    if (isEditing) {
      updateMutation.mutate(
        {
          id: idea.id,
          title,
          teaser: teaser || null,
          description: description || null,
          category: category || null,
          tags,
          isConfidential,
          inventionDisclosure,
        },
        {
          onSuccess: () => {
            submitMutation.mutate({ id: idea.id });
          },
        },
      );
    } else {
      createMutation.mutate({
        campaignId,
        title,
        teaser: teaser || undefined,
        description: description || undefined,
        category: category || undefined,
        tags,
        isConfidential,
        inventionDisclosure,
        submitImmediately: true,
      });
    }
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? submitMutation.error;

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Give your idea a clear, concise title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(null);
            }}
          />
          {titleError && <p className="mt-1 text-sm text-red-600">{titleError}</p>}
        </div>

        <div>
          <Label htmlFor="teaser">Teaser</Label>
          <Textarea
            id="teaser"
            placeholder="A short summary of your idea (visible on cards)"
            rows={2}
            value={teaser}
            onChange={(e) => setTeaser(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your idea in detail..."
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g., Sustainability, Digitalization"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            placeholder="e.g., AI, automation, cost-reduction"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
            />
            Confidential idea
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={inventionDisclosure}
              onChange={(e) => setInventionDisclosure(e.target.checked)}
            />
            Invention disclosure
          </label>
        </div>
      </div>

      {mutationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {mutationError.message}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" disabled={isPending} onClick={handleSaveDraft}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save as Draft
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Idea
        </Button>
      </div>
    </form>
  );
}
