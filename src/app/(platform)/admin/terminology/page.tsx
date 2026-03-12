"use client";

import * as React from "react";
import { BookText, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

export default function AdminTerminologyPage() {
  const utils = trpc.useUtils();
  const { data: terminology, isLoading } = trpc.admin.terminologyGet.useQuery();

  const updateMutation = trpc.admin.terminologyUpdate.useMutation({
    onSuccess: () => {
      void utils.admin.terminologyGet.invalidate();
    },
  });

  const resetMutation = trpc.admin.terminologyReset.useMutation({
    onSuccess: () => {
      void utils.admin.terminologyGet.invalidate();
    },
  });

  const [form, setForm] = React.useState({
    campaign: "",
    idea: "",
    channel: "",
    evaluation: "",
    bucket: "",
  });

  React.useEffect(() => {
    if (terminology) {
      setForm({
        campaign: terminology.campaign,
        idea: terminology.idea,
        channel: terminology.channel,
        evaluation: terminology.evaluation,
        bucket: terminology.bucket,
      });
    }
  }, [terminology]);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    updateMutation.mutate({
      campaign: form.campaign || undefined,
      idea: form.idea || undefined,
      channel: form.channel || undefined,
      evaluation: form.evaluation || undefined,
      bucket: form.bucket || undefined,
    });
  }

  function handleReset() {
    resetMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50">
            <BookText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">Terminology</h1>
            <p className="text-sm text-gray-500">
              Customize the terms used throughout the platform
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Terminology Fields */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Platform Terms</h2>
        <p className="mb-6 text-sm text-gray-500">
          Change how key concepts are named across the platform. For example, rename
          &quot;Campaign&quot; to &quot;Challenge&quot; or &quot;Idea&quot; to &quot;Proposal&quot;.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="term-campaign">Campaign</Label>
            <Input
              id="term-campaign"
              value={form.campaign}
              onChange={(e) => handleChange("campaign", e.target.value)}
              placeholder="Campaign"
            />
            <p className="text-xs text-gray-400">
              Default: Campaign. Examples: Challenge, Contest, Program
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="term-idea">Idea</Label>
            <Input
              id="term-idea"
              value={form.idea}
              onChange={(e) => handleChange("idea", e.target.value)}
              placeholder="Idea"
            />
            <p className="text-xs text-gray-400">
              Default: Idea. Examples: Proposal, Submission, Innovation
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="term-channel">Channel</Label>
            <Input
              id="term-channel"
              value={form.channel}
              onChange={(e) => handleChange("channel", e.target.value)}
              placeholder="Channel"
            />
            <p className="text-xs text-gray-400">
              Default: Channel. Examples: Community, Space, Group
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="term-evaluation">Evaluation</Label>
            <Input
              id="term-evaluation"
              value={form.evaluation}
              onChange={(e) => handleChange("evaluation", e.target.value)}
              placeholder="Evaluation"
            />
            <p className="text-xs text-gray-400">
              Default: Evaluation. Examples: Review, Assessment, Scoring
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="term-bucket">Bucket</Label>
            <Input
              id="term-bucket"
              value={form.bucket}
              onChange={(e) => handleChange("bucket", e.target.value)}
              placeholder="Bucket"
            />
            <p className="text-xs text-gray-400">
              Default: Bucket. Examples: Category, Folder, Collection
            </p>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Preview</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            &quot;Create a new <strong>{form.campaign || "Campaign"}</strong> to collect{" "}
            <strong>{form.idea || "Idea"}s</strong> from your team.&quot;
          </p>
          <p>
            &quot;Browse <strong>{form.channel || "Channel"}s</strong> to discover curated
            innovation themes.&quot;
          </p>
          <p>
            &quot;Start an <strong>{form.evaluation || "Evaluation"}</strong> session to score and
            rank <strong>{form.idea || "Idea"}s</strong>.&quot;
          </p>
          <p>
            &quot;Organize <strong>{form.idea || "Idea"}s</strong> into{" "}
            <strong>{form.bucket || "Bucket"}s</strong> for structured review.&quot;
          </p>
        </div>
      </Card>
    </div>
  );
}
