"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function NewChannelPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [teaser, setTeaser] = React.useState("");
  const [problemStatement, setProblemStatement] = React.useState("");

  const createMutation = trpc.channel.create.useMutation();
  const handleSuccess = React.useCallback(
    (id: string) => {
      router.push(`/channels/${id}`);
    },
    [router],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        teaser: teaser.trim() || undefined,
        problemStatement: problemStatement.trim() || undefined,
      },
      {
        onSuccess: (data: { id: string }) => {
          handleSuccess(data.id);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/channels"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Radio className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <CardTitle>Create Channel</CardTitle>
              <CardDescription>
                Set up an always-open channel for continuous idea collection.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Channel Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Sustainability Ideas"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teaser">Teaser</Label>
              <Input
                id="teaser"
                placeholder="Short description shown on channel cards"
                value={teaser}
                onChange={(e) => setTeaser(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the channel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="problemStatement">Problem Statement (optional)</Label>
              <Textarea
                id="problemStatement"
                placeholder="Describe the problem or challenge this channel addresses..."
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-gray-400">
                Help contributors understand the context by describing the problem space.
              </p>
            </div>

            {createMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {createMutation.error.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Link href="/channels">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Channel"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
