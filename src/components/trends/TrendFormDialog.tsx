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

type TrendType = "MEGA" | "MACRO" | "MICRO";

interface TrendFormData {
  title: string;
  description: string;
  type: TrendType;
  sourceUrl: string;
  isConfidential: boolean;
  businessRelevance: number | null;
}

interface TrendFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TrendFormData) => void;
  isLoading: boolean;
  initialData?: {
    title: string;
    description: string | null;
    type: string;
    sourceUrl: string | null;
    isConfidential: boolean;
    businessRelevance: number | null;
  };
  mode: "create" | "edit";
}

const TREND_TYPES: { value: TrendType; label: string; description: string }[] = [
  { value: "MEGA", label: "Mega", description: "Long-term, societal-level shifts" },
  { value: "MACRO", label: "Macro", description: "Industry-level trends (3-5 years)" },
  { value: "MICRO", label: "Micro", description: "Short-term, emerging signals" },
];

export function TrendFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
  mode,
}: TrendFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState<TrendType>((initialData?.type as TrendType) ?? "MICRO");
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "");
  const [isConfidential, setIsConfidential] = useState(initialData?.isConfidential ?? false);
  const [businessRelevance, setBusinessRelevance] = useState<string>(
    initialData?.businessRelevance?.toString() ?? "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      type,
      sourceUrl: sourceUrl.trim(),
      isConfidential,
      businessRelevance: businessRelevance ? parseFloat(businessRelevance) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Trend" : "Edit Trend"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="trend-title" className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="trend-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Generative AI in Enterprise"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Trend Level</label>
            <div className="flex gap-2">
              {TREND_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
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
            <label htmlFor="trend-desc" className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              id="trend-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the trend and its business impact..."
              rows={4}
              maxLength={10000}
            />
          </div>

          <div>
            <label htmlFor="trend-source" className="mb-1 block text-sm font-medium text-gray-700">
              Source URL
            </label>
            <Input
              id="trend-source"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label
              htmlFor="trend-relevance"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Business Relevance (0-10)
            </label>
            <Input
              id="trend-relevance"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={businessRelevance}
              onChange={(e) => setBusinessRelevance(e.target.value)}
              placeholder="e.g. 7.5"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="trend-confidential"
              type="checkbox"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="trend-confidential" className="text-sm text-gray-700">
              Mark as confidential
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
              {isLoading ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
