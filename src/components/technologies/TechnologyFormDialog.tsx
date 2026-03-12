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
type CategoryLevel =
  | "AI_ML"
  | "BLOCKCHAIN"
  | "CLOUD"
  | "CYBERSECURITY"
  | "DATA_ANALYTICS"
  | "HARDWARE"
  | "IOT"
  | "MOBILE"
  | "NETWORKING"
  | "ROBOTICS"
  | "SOFTWARE"
  | "OTHER";

interface TechnologyFormData {
  title: string;
  description: string;
  category: CategoryLevel;
  maturity: MaturityLevel;
  sourceUrl: string;
  isConfidential: boolean;
  businessRelevance: number | null;
}

interface TechnologyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TechnologyFormData) => void;
  isLoading: boolean;
  initialData?: {
    title: string;
    description: string | null;
    category?: string;
    maturity?: string;
    sourceUrl: string | null;
    isConfidential: boolean;
    businessRelevance?: number | null;
  };
  mode: "create" | "edit";
}

const MATURITY_LEVELS: { value: MaturityLevel; label: string; description: string }[] = [
  { value: "EMERGING", label: "Emerging", description: "Early stage, high potential" },
  { value: "GROWING", label: "Growing", description: "Gaining traction and adoption" },
  { value: "MATURE", label: "Mature", description: "Widely adopted, stable" },
  { value: "DECLINING", label: "Declining", description: "Being replaced or phased out" },
];

const CATEGORIES: { value: CategoryLevel; label: string }[] = [
  { value: "AI_ML", label: "AI/ML" },
  { value: "BLOCKCHAIN", label: "Blockchain" },
  { value: "CLOUD", label: "Cloud" },
  { value: "CYBERSECURITY", label: "Cybersecurity" },
  { value: "DATA_ANALYTICS", label: "Data & Analytics" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "IOT", label: "IoT" },
  { value: "MOBILE", label: "Mobile" },
  { value: "NETWORKING", label: "Networking" },
  { value: "ROBOTICS", label: "Robotics" },
  { value: "SOFTWARE", label: "Software" },
  { value: "OTHER", label: "Other" },
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
  const [category, setCategory] = useState<CategoryLevel>(
    (initialData?.category as CategoryLevel) ?? "OTHER",
  );
  const [maturity, setMaturity] = useState<MaturityLevel>(
    (initialData?.maturity as MaturityLevel) ?? "EMERGING",
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl ?? "");
  const [isConfidential, setIsConfidential] = useState(initialData?.isConfidential ?? false);
  const [businessRelevance, setBusinessRelevance] = useState<string>(
    initialData?.businessRelevance != null ? String(initialData.businessRelevance) : "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      maturity,
      sourceUrl: sourceUrl.trim(),
      isConfidential,
      businessRelevance: businessRelevance ? Number(businessRelevance) : null,
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
            <label htmlFor="tech-category" className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="tech-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryLevel)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Maturity Level</label>
            <div className="grid grid-cols-2 gap-2">
              {MATURITY_LEVELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMaturity(m.value)}
                  className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    maturity === m.value
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

          <div>
            <label
              htmlFor="tech-relevance"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Business Relevance (0-10)
            </label>
            <Input
              id="tech-relevance"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={businessRelevance}
              onChange={(e) => setBusinessRelevance(e.target.value)}
              placeholder="e.g. 7.5"
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
