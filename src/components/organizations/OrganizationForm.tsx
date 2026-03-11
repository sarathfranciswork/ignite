"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";

const organizationFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(5000).optional(),
  websiteUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  logoUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  industry: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  fundingStage: z.string().max(100).optional(),
  fundingTotal: z.string().max(100).optional(),
  relationshipStatus: z.enum([
    "IDENTIFIED",
    "VERIFIED",
    "QUALIFIED",
    "EVALUATION",
    "PILOT",
    "PARTNERSHIP",
    "ARCHIVED",
  ]),
  ndaStatus: z.enum(["NONE", "REQUESTED", "SIGNED", "EXPIRED"]),
  isConfidential: z.boolean(),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

interface OrganizationFormProps {
  defaultValues?: Partial<OrganizationFormValues>;
  excludeId?: string;
  onSubmit: (data: {
    name: string;
    description?: string;
    websiteUrl?: string;
    logoUrl?: string;
    industry?: string;
    location?: string;
    fundingStage?: string;
    fundingTotal?: string;
    relationshipStatus:
      | "IDENTIFIED"
      | "VERIFIED"
      | "QUALIFIED"
      | "EVALUATION"
      | "PILOT"
      | "PARTNERSHIP"
      | "ARCHIVED";
    ndaStatus: "NONE" | "REQUESTED" | "SIGNED" | "EXPIRED";
    isConfidential: boolean;
  }) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function OrganizationForm({
  defaultValues,
  excludeId,
  onSubmit,
  isSubmitting,
  submitLabel,
}: OrganizationFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      websiteUrl: defaultValues?.websiteUrl ?? "",
      logoUrl: defaultValues?.logoUrl ?? "",
      industry: defaultValues?.industry ?? "",
      location: defaultValues?.location ?? "",
      fundingStage: defaultValues?.fundingStage ?? "",
      fundingTotal: defaultValues?.fundingTotal ?? "",
      relationshipStatus: defaultValues?.relationshipStatus ?? "IDENTIFIED",
      ndaStatus: defaultValues?.ndaStatus ?? "NONE",
      isConfidential: defaultValues?.isConfidential ?? false,
    },
  });

  const websiteUrlValue = watch("websiteUrl");
  const debouncedUrl = useDebounce(websiteUrlValue ?? "", 500);
  const shouldCheckUrl = debouncedUrl.length > 0 && isValidUrl(debouncedUrl);

  const urlDuplicateQuery = trpc.organization.checkDuplicateByUrl.useQuery(
    { websiteUrl: debouncedUrl, excludeId },
    { enabled: shouldCheckUrl },
  );

  function handleFormSubmit(values: OrganizationFormValues) {
    onSubmit({
      name: values.name,
      description: values.description || undefined,
      websiteUrl: values.websiteUrl || undefined,
      logoUrl: values.logoUrl || undefined,
      industry: values.industry || undefined,
      location: values.location || undefined,
      fundingStage: values.fundingStage || undefined,
      fundingTotal: values.fundingTotal || undefined,
      relationshipStatus: values.relationshipStatus,
      ndaStatus: values.ndaStatus,
      isConfidential: values.isConfidential,
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

        <div className="sm:col-span-2">
          <Label htmlFor="websiteUrl">Website</Label>
          <Input
            id="websiteUrl"
            type="url"
            placeholder="https://"
            {...register("websiteUrl")}
            className="mt-1.5"
          />
          {errors.websiteUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.websiteUrl.message}</p>
          )}
          {urlDuplicateQuery.data?.isDuplicate && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p>
                  An organization with this website already exists:{" "}
                  <strong>{urlDuplicateQuery.data.existingName}</strong>.
                </p>
                <Link
                  href={`/partners/${urlDuplicateQuery.data.existingId}`}
                  className="mt-1 inline-block font-medium text-amber-700 underline hover:text-amber-900"
                >
                  View existing organization
                </Link>
              </div>
            </div>
          )}
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
          <Label htmlFor="fundingStage">Funding Stage</Label>
          <Input
            id="fundingStage"
            placeholder="e.g. Series A"
            {...register("fundingStage")}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="fundingTotal">Funding Total</Label>
          <Input
            id="fundingTotal"
            placeholder="e.g. $10M"
            {...register("fundingTotal")}
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
            <option value="IDENTIFIED">Identified</option>
            <option value="VERIFIED">Verified</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="EVALUATION">Evaluation</option>
            <option value="PILOT">Pilot</option>
            <option value="PARTNERSHIP">Partnership</option>
            <option value="ARCHIVED">Archived</option>
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
            <option value="REQUESTED">Requested</option>
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
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
