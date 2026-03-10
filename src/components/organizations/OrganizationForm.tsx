"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const organizationFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  website: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  logoUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  fundingInfo: z.string().max(500).optional(),
  relationshipStatus: z.enum(["PROSPECT", "ACTIVE", "ON_HOLD", "ENDED"]),
  ndaStatus: z.enum(["NONE", "PENDING", "SIGNED", "EXPIRED"]),
  isConfidential: z.boolean(),
  tags: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  defaultValues?: Partial<OrganizationFormValues & { tags: string }>;
  onSubmit: (data: {
    name: string;
    description?: string;
    website?: string;
    logoUrl?: string;
    industry?: string;
    location?: string;
    fundingInfo?: string;
    relationshipStatus: "PROSPECT" | "ACTIVE" | "ON_HOLD" | "ENDED";
    ndaStatus: "NONE" | "PENDING" | "SIGNED" | "EXPIRED";
    isConfidential: boolean;
    tags: string[];
    notes?: string;
  }) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

export function OrganizationForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: OrganizationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      website: defaultValues?.website ?? "",
      logoUrl: defaultValues?.logoUrl ?? "",
      industry: defaultValues?.industry ?? "",
      location: defaultValues?.location ?? "",
      fundingInfo: defaultValues?.fundingInfo ?? "",
      relationshipStatus: defaultValues?.relationshipStatus ?? "PROSPECT",
      ndaStatus: defaultValues?.ndaStatus ?? "NONE",
      isConfidential: defaultValues?.isConfidential ?? false,
      tags: defaultValues?.tags ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  function handleFormSubmit(values: OrganizationFormValues) {
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    onSubmit({
      name: values.name,
      description: values.description || undefined,
      website: values.website || undefined,
      logoUrl: values.logoUrl || undefined,
      industry: values.industry || undefined,
      location: values.location || undefined,
      fundingInfo: values.fundingInfo || undefined,
      relationshipStatus: values.relationshipStatus,
      ndaStatus: values.ndaStatus,
      isConfidential: values.isConfidential,
      tags,
      notes: values.notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Organization Name *</Label>
          <Input id="name" {...register("name")} className="mt-1.5" />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} rows={3} className="mt-1.5" />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://"
            {...register("website")}
            className="mt-1.5"
          />
          {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>}
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            type="url"
            placeholder="https://"
            {...register("logoUrl")}
            className="mt-1.5"
          />
          {errors.logoUrl && <p className="mt-1 text-sm text-red-600">{errors.logoUrl.message}</p>}
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" {...register("industry")} className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input id="location" {...register("location")} className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="fundingInfo">Funding Info</Label>
          <Input id="fundingInfo" {...register("fundingInfo")} className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            placeholder="e.g. fintech, AI, startup"
            {...register("tags")}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="relationshipStatus">Relationship Status</Label>
          <select
            id="relationshipStatus"
            {...register("relationshipStatus")}
            className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="PROSPECT">Prospect</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="ENDED">Ended</option>
          </select>
        </div>

        <div>
          <Label htmlFor="ndaStatus">NDA Status</Label>
          <select
            id="ndaStatus"
            {...register("ndaStatus")}
            className="mt-1.5 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="NONE">None</option>
            <option value="PENDING">Pending</option>
            <option value="SIGNED">Signed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>

        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="isConfidential"
            {...register("isConfidential")}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <Label htmlFor="isConfidential" className="cursor-pointer">
            Mark as confidential
          </Label>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Internal Notes</Label>
          <Textarea id="notes" {...register("notes")} rows={3} className="mt-1.5" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
