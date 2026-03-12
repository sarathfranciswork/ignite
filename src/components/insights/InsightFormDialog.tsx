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
import { Textarea } from "@/components/ui/textarea";

type InsightType = "SIGNAL" | "OBSERVATION" | "OPPORTUNITY" | "RISK";
type InsightScope = "GLOBAL" | "CAMPAIGN" | "TREND";

interface InsightFormData {
  title: string;
  description: string;
  type: InsightType;
  scope: InsightScope;
  sourceUrl: string;
  isEditorial: boolean;
}

interface InsightFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InsightFormData) => void;
  isLoading: boolean;
  initialData?: {
    title: string;
    description: string | null;
    type: string;
    scope: string;
    sourceUrl: string | null;
    isEditorial: boolean;
  };
  mode: "create" | "edit";
}

const INSIGHT_TYPES: { value: InsightType; label: string; description: string }[] = [
  { value: "SIGNAL", label: "Signal", description: "Market signal or external indicator" },
  { value: "OBSERVATION", label: "Observation", description: "Direct observation or finding" },
  { value: "OPPORTUNITY", label: "Opportunity", description: "Potential opportunity identified" },
  { value: "RISK", label: "Risk", description: "Identified risk or threat" },
];

const INSIGHT_SCOPES: { value: InsightScope; label: string; description: string }[] = [
  { value: "GLOBAL", label: "Global", description: "Visible across the organization" },
  { value: "CAMPAIGN", label: "Campaign", description: "Linked to a specific campaign" },
  { value: "TREND", label: "Trend", description: "Linked to a specific trend" },
];

export function InsightFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
  mode,
}: InsightFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState<InsightType>((initialData?.type as InsightType) ?? "SIGNAL");
  const [scope, setScope] = useState<InsightScope>(
    (initialData?.scope as InsightScope) ?? "GLOBAL",
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "");
  const [isEditorial, setIsEditorial] = useState(initialData?.isEditorial ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      scope,
      sourceUrl: sourceUrl.trim(),
      isEditorial,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Share Insight" : "Edit Insight"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="insight-title" className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="insight-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI adoption trend in healthcare"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Insight Type</label>
            <div className="grid grid-cols-2 gap-2">
              {INSIGHT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    type === t.value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{t.label}</div>
                  <div className="mt-0.5 text-xs text-gray-400">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Scope</label>
            <div className="grid grid-cols-3 gap-2">
              {INSIGHT_SCOPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScope(s.value)}
                  className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    scope === s.value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="insight-desc" className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              id="insight-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the insight, signal, or observation..."
              rows={4}
              maxLength={10000}
            />
          </div>

          <div>
            <label
              htmlFor="insight-source"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Source URL
            </label>
            <Input
              id="insight-source"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="insight-editorial"
              type="checkbox"
              checked={isEditorial}
              onChange={(e) => setIsEditorial(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="insight-editorial" className="text-sm text-gray-700">
              Mark as editorial (curated by management)
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading ? "Saving..." : mode === "create" ? "Share" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
