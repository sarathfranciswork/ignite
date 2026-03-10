"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CampaignSettingsTabProps {
  campaign: {
    id: string;
    title: string;
    description: string | null;
    teaser: string | null;
    bannerUrl: string | null;
    startDate: Date | string | null;
    endDate: Date | string | null;
    tags: string[];
    isConfidential: boolean;
  };
}

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0] ?? "";
}

export function CampaignSettingsTab({ campaign }: CampaignSettingsTabProps) {
  const [title, setTitle] = useState(campaign.title);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [teaser, setTeaser] = useState(campaign.teaser ?? "");
  const [startDate, setStartDate] = useState(toDateInputValue(campaign.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(campaign.endDate));
  const [tagsInput, setTagsInput] = useState(campaign.tags.join(", "));
  const [isConfidential, setIsConfidential] = useState(campaign.isConfidential);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateMutation = trpc.campaign.update.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await updateMutation.mutateAsync({
        id: campaign.id,
        title: title.trim(),
        description: description.trim() || null,
        teaser: teaser.trim() || null,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        tags,
        isConfidential,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update campaign";
      setError(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-6"
    >
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          Campaign updated successfully
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="settings-title">Title</Label>
        <Input
          id="settings-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-description">Description</Label>
        <Textarea
          id="settings-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          maxLength={5000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-teaser">Teaser</Label>
        <Input
          id="settings-teaser"
          value={teaser}
          onChange={(e) => setTeaser(e.target.value)}
          maxLength={500}
          placeholder="A short summary shown on campaign cards"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="settings-start">Start Date</Label>
          <Input
            id="settings-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-end">End Date</Label>
          <Input
            id="settings-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-tags">Tags</Label>
        <Input
          id="settings-tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="innovation, sustainability, digital (comma-separated)"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          id="settings-confidential"
          type="checkbox"
          checked={isConfidential}
          onChange={(e) => setIsConfidential(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <Label htmlFor="settings-confidential">Confidential campaign</Label>
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
