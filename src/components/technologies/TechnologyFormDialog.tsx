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

type MaturityLevel = "EMERGING" | "GROWING" | "MATURE" | "DECLINING";

interface TechnologyFormData {
  title: string;
  description: string;
  maturityLevel: MaturityLevel | null;
  sourceUrl: string;
  isConfidential: boolean;
}

interface TechnologyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TechnologyFormData) => void;
  isLoading: boolean;
  initialData?: {
    title: string;
    description: string | null;
    maturityLevel: string | null;
    sourceUrl: string | null;
    isConfidential: boolean;
  };
  mode: "create" | "edit";
}

const MATURITY_LEVELS: { value: MaturityLevel; label: string; description: string }[] = [
  { value: "EMERGING", label: "Emerging", description: "Early stage, high potential" },
  { value: "GROWING", label: "Growing", description: "Gaining traction and adoption" },
  { value: "MATURE", label: "Mature", description: "Widely adopted, stable" },
  { value: "DECLINING", label: "Declining", description: "Being replaced or phased out" },
];

export function TechnologyFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
  mode,
}: TechnologyFormDialogProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [maturityLevel, setMaturityLevel] = useState<MaturityLevel | null>(
    (initialData?.maturityLevel as MaturityLevel) ?? null,
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "");
  const [isConfidential, setIsConfidential] = useState(initialData?.isConfidential ?? false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      maturityLevel,
      sourceUrl: sourceUrl.trim(),
      isConfidential,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Technology" : "Edit Technology"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="tech-title" className="mb-1 block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="tech-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kubernetes, GPT-4, GraphQL"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Maturity Level</label>
            <div className="grid grid-cols-2 gap-2">
              {MATURITY_LEVELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMaturityLevel(maturityLevel === m.value ? null : m.value)}
                  className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    maturityLevel === m.value
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="mt-0.5 text-xs text-gray-400">{m.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="tech-desc" className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <Textarea
              id="tech-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the technology and its applications..."
              rows={4}
              maxLength={10000}
            />
          </div>

          <div>
            <label htmlFor="tech-source" className="mb-1 block text-sm font-medium text-gray-700">
              Source URL
            </label>
            <Input
              id="tech-source"
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tech-confidential"
              type="checkbox"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="tech-confidential" className="text-sm text-gray-700">
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
