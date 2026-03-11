"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

interface UseCaseFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    problemDescription: string | null;
    suggestedSolution: string | null;
    benefit: string | null;
  };
}

export function UseCaseForm({ mode, initialData }: UseCaseFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [title, setTitle] = React.useState(initialData?.title ?? "");
  const [problemDescription, setProblemDescription] = React.useState(
    initialData?.problemDescription ?? "",
  );
  const [suggestedSolution, setSuggestedSolution] = React.useState(
    initialData?.suggestedSolution ?? "",
  );
  const [benefit, setBenefit] = React.useState(initialData?.benefit ?? "");

  const createMutation = trpc.useCase.create.useMutation({
    onSuccess: (data) => {
      void utils.useCase.list.invalidate();
      router.push(`/partners/use-cases/${data.id}`);
    },
  });

  const updateMutation = trpc.useCase.update.useMutation({
    onSuccess: (data) => {
      void utils.useCase.list.invalidate();
      void utils.useCase.getById.invalidate({ id: data.id });
      router.push(`/partners/use-cases/${data.id}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error ?? updateMutation.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "create") {
      createMutation.mutate({
        title,
        problemDescription: problemDescription || undefined,
        suggestedSolution: suggestedSolution || undefined,
        benefit: benefit || undefined,
      });
    } else if (initialData) {
      updateMutation.mutate({
        id: initialData.id,
        title,
        problemDescription: problemDescription || null,
        suggestedSolution: suggestedSolution || null,
        benefit: benefit || null,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "New Use Case" : "Edit Use Case"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error.message}
            </div>
          )}

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter use case title"
              required
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="problemDescription">Problem Description</Label>
            <Textarea
              id="problemDescription"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Describe the problem this use case addresses"
              rows={3}
              maxLength={5000}
            />
          </div>

          <div>
            <Label htmlFor="suggestedSolution">Suggested Solution</Label>
            <Textarea
              id="suggestedSolution"
              value={suggestedSolution}
              onChange={(e) => setSuggestedSolution(e.target.value)}
              placeholder="Describe the suggested solution"
              rows={3}
              maxLength={5000}
            />
          </div>

          <div>
            <Label htmlFor="benefit">Expected Benefit</Label>
            <Textarea
              id="benefit"
              value={benefit}
              onChange={(e) => setBenefit(e.target.value)}
              placeholder="Describe the expected benefit"
              rows={3}
              maxLength={5000}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Use Case"
                  : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
