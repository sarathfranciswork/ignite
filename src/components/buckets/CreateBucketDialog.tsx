"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BUCKET_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#6B7280",
];

const IDEA_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "COMMUNITY_DISCUSSION", label: "Community Discussion" },
  { value: "HOT", label: "Hot" },
  { value: "EVALUATION", label: "Evaluation" },
  { value: "SELECTED_IMPLEMENTATION", label: "Selected for Implementation" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const bucketFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  type: z.enum(["MANUAL", "SMART"]),
  description: z.string().max(2000).optional(),
  filterStatus: z.string().optional(),
  filterMinLikes: z.string().optional(),
  filterMinComments: z.string().optional(),
  filterTag: z.string().optional(),
  filterCategory: z.string().optional(),
});

type BucketFormValues = z.infer<typeof bucketFormSchema>;

interface CreateBucketDialogProps {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBucketDialog({ campaignId, open, onOpenChange }: CreateBucketDialogProps) {
  const utils = trpc.useUtils();

  const form = useForm<BucketFormValues>({
    resolver: zodResolver(bucketFormSchema),
    defaultValues: {
      name: "",
      color: "#6366F1",
      type: "MANUAL",
      description: "",
    },
  });

  const bucketType = form.watch("type");

  const createMutation = trpc.bucket.create.useMutation({
    onSuccess: () => {
      void utils.bucket.sidebar.invalidate({ campaignId });
      void utils.bucket.list.invalidate({ campaignId });
      form.reset();
      onOpenChange(false);
    },
  });

  function onSubmit(values: BucketFormValues) {
    const filterCriteria =
      values.type === "SMART"
        ? {
            ...(values.filterStatus
              ? { status: values.filterStatus as "DRAFT" | "QUALIFICATION" | "COMMUNITY_DISCUSSION" | "HOT" | "EVALUATION" | "SELECTED_IMPLEMENTATION" | "IMPLEMENTED" | "ARCHIVED" }
              : {}),
            ...(values.filterMinLikes ? { minLikes: parseInt(values.filterMinLikes, 10) } : {}),
            ...(values.filterMinComments
              ? { minComments: parseInt(values.filterMinComments, 10) }
              : {}),
            ...(values.filterTag ? { tag: values.filterTag } : {}),
            ...(values.filterCategory ? { category: values.filterCategory } : {}),
          }
        : undefined;

    createMutation.mutate({
      campaignId,
      name: values.name,
      color: values.color,
      type: values.type,
      description: values.description || undefined,
      filterCriteria,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Bucket</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} placeholder="e.g., Top Ideas" />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <Label>Color</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {BUCKET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => form.setValue("color", color)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${
                    form.watch("color") === color
                      ? "scale-110 border-gray-900"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Type</Label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => form.setValue("type", "MANUAL")}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  bucketType === "MANUAL"
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => form.setValue("type", "SMART")}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  bucketType === "SMART"
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Smart
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe this bucket..."
              rows={2}
            />
          </div>

          {bucketType === "SMART" && (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-700">
                Smart bucket filters — ideas matching these criteria auto-populate on access
              </p>

              <div>
                <Label htmlFor="filterStatus" className="text-xs">
                  Status
                </Label>
                <select
                  id="filterStatus"
                  {...form.register("filterStatus")}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="">Any status</option>
                  {IDEA_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="filterMinLikes" className="text-xs">
                    Min Likes
                  </Label>
                  <Input
                    id="filterMinLikes"
                    type="number"
                    min={0}
                    {...form.register("filterMinLikes")}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="filterMinComments" className="text-xs">
                    Min Comments
                  </Label>
                  <Input
                    id="filterMinComments"
                    type="number"
                    min={0}
                    {...form.register("filterMinComments")}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="filterTag" className="text-xs">
                  Tag
                </Label>
                <Input
                  id="filterTag"
                  {...form.register("filterTag")}
                  placeholder="e.g., sustainability"
                />
              </div>

              <div>
                <Label htmlFor="filterCategory" className="text-xs">
                  Category
                </Label>
                <Input
                  id="filterCategory"
                  {...form.register("filterCategory")}
                  placeholder="e.g., Product"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Bucket"}
            </Button>
          </div>

          {createMutation.isError && (
            <p className="text-xs text-red-500">{createMutation.error.message}</p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
