import { z } from "zod";

export const contactListInput = z.object({
  organizationId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export const contactCreateInput = z.object({
  organizationId: z.string().cuid(),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or less"),
  email: z.string().email("Must be a valid email").optional(),
  phone: z.string().max(30).optional(),
  jobTitle: z.string().max(150).optional(),
  linkedinUrl: z.string().url("Must be a valid URL").optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export const contactUpdateInput = z.object({
  id: z.string().cuid(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  jobTitle: z.string().max(150).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const contactDeleteInput = z.object({
  id: z.string().cuid(),
});

export const contactInviteInput = z.object({
  id: z.string().cuid(),
});

export type ContactListInput = z.infer<typeof contactListInput>;
export type ContactCreateInput = z.infer<typeof contactCreateInput>;
export type ContactUpdateInput = z.infer<typeof contactUpdateInput>;
