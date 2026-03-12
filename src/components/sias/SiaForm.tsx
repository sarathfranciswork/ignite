"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const siaFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(10000).optional(),
  imageUrl: z.string().url("Must be a valid URL").max(2048).optional().or(z.literal("")),
});

type SiaFormValues = z.infer<typeof siaFormSchema>;

interface SiaFormProps {
  defaultValues?: Partial<SiaFormValues>;
  onSubmit: (values: SiaFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function SiaForm({ defaultValues, onSubmit, isSubmitting, submitLabel }: SiaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SiaFormValues>({
    resolver: zodResolver(siaFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      imageUrl: defaultValues?.imageUrl ?? "",
    },
  });

  function handleFormSubmit(values: SiaFormValues) {
    onSubmit({
      ...values,
      imageUrl: values.imageUrl || undefined,
      description: values.description || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="e.g., Sustainable Energy" {...register("name")} />
        {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the goals and focus of this strategic innovation area..."
          rows={5}
          {...register("description")}
        />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL (optional)</Label>
        <Input
          id="imageUrl"
          placeholder="https://example.com/image.jpg"
          {...register("imageUrl")}
        />
        {errors.imageUrl && <p className="text-sm text-red-600">{errors.imageUrl.message}</p>}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
