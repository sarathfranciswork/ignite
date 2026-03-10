"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { Save, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import type { WizardStepDescriptionData } from "@/types/campaign-wizard";

interface StepDescriptionProps {
  defaultValues: WizardStepDescriptionData;
  onSave: (data: WizardStepDescriptionData) => void;
  isSaving: boolean;
}

export function StepDescription({ defaultValues, onSave, isSaving }: StepDescriptionProps) {
  const { register, handleSubmit, control, watch, setValue, formState } =
    useForm<WizardStepDescriptionData>({
      defaultValues,
    });

  const tags = watch("tags") ?? [];
  const [tagInput, setTagInput] = React.useState("");

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 20) {
      setValue("tags", [...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
    );
  };

  const onSubmit = (data: WizardStepDescriptionData) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaign Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wizard-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="wizard-title"
              {...register("title", { required: "Title is required" })}
              placeholder="e.g., Innovation Challenge 2026"
              maxLength={200}
            />
            {formState.errors.title && (
              <p className="text-xs text-red-500">{formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-teaser">Teaser</Label>
            <Input
              id="wizard-teaser"
              {...register("teaser")}
              placeholder="Short description shown on campaign cards"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Rich Text)</Label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <RichTextEditor
                  content={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Describe the campaign goals, rules, and what participants should know..."
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-videoUrl">Video URL (YouTube/Vimeo)</Label>
            <Input
              id="wizard-videoUrl"
              {...register("videoUrl")}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-callToAction">Call to Action</Label>
            <Input
              id="wizard-callToAction"
              {...register("callToAction")}
              placeholder="e.g., Submit your idea now!"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-supportContent">Support Section</Label>
            <Textarea
              id="wizard-supportContent"
              {...register("supportContent")}
              placeholder="Additional support information, FAQ, contact details..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="wizard-submissionClose">Submission Close</Label>
              <Input id="wizard-submissionClose" type="date" {...register("submissionCloseDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-votingClose">Voting Close</Label>
              <Input id="wizard-votingClose" type="date" {...register("votingCloseDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-plannedClose">Planned Close</Label>
              <Input id="wizard-plannedClose" type="date" {...register("plannedCloseDate")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag..."
              maxLength={50}
            />
            <Button type="button" variant="outline" size="icon" onClick={addTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Step 1"}
        </Button>
      </div>
    </form>
  );
}
