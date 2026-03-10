"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Must be a valid email").or(z.literal("")).optional(),
  phone: z.string().max(30).optional(),
  jobTitle: z.string().max(150).optional(),
  linkedinUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
  isPrimary: z.boolean(),
  notes: z.string().max(2000).optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormDialogProps {
  organizationId: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
    linkedinUrl: string | null;
    isPrimary: boolean;
    notes: string | null;
  };
  onClose: () => void;
}

export function ContactFormDialog({ organizationId, contact, onClose }: ContactFormDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = !!contact;

  const createContact = trpc.organization.createContact.useMutation({
    onSuccess: () => {
      void utils.organization.listContacts.invalidate({ organizationId });
      void utils.organization.getById.invalidate({ id: organizationId });
      onClose();
    },
  });

  const updateContact = trpc.organization.updateContact.useMutation({
    onSuccess: () => {
      void utils.organization.listContacts.invalidate({ organizationId });
      void utils.organization.getById.invalidate({ id: organizationId });
      onClose();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      jobTitle: contact?.jobTitle ?? "",
      linkedinUrl: contact?.linkedinUrl ?? "",
      isPrimary: contact?.isPrimary ?? false,
      notes: contact?.notes ?? "",
    },
  });

  function onSubmit(values: ContactFormValues) {
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email || undefined,
      phone: values.phone || undefined,
      jobTitle: values.jobTitle || undefined,
      linkedinUrl: values.linkedinUrl || undefined,
      isPrimary: values.isPrimary,
      notes: values.notes || undefined,
    };

    if (isEdit && contact) {
      updateContact.mutate({ id: contact.id, ...payload });
    } else {
      createContact.mutate({ organizationId, ...payload });
    }
  }

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} className="mt-1.5" />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} className="mt-1.5" />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} className="mt-1.5" />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} className="mt-1.5" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" {...register("jobTitle")} className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://"
                {...register("linkedinUrl")}
                className="mt-1.5"
              />
              {errors.linkedinUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              {...register("isPrimary")}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Label htmlFor="isPrimary" className="cursor-pointer">
              Primary contact
            </Label>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={2} className="mt-1.5" />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Update" : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
