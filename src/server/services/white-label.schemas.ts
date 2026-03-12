import { z } from "zod";

const hexColorPattern = /^#[0-9a-fA-F]{6}$/;

export const whiteLabelUpdateInput = z.object({
  platformName: z.string().min(1).max(100).optional(),
  logoUrl: z.string().max(2048).nullable().optional(),
  logoSmallUrl: z.string().max(2048).nullable().optional(),
  faviconUrl: z.string().max(2048).nullable().optional(),
  loginBannerUrl: z.string().max(2048).nullable().optional(),
  primaryColor: z.string().regex(hexColorPattern, "Must be a valid hex color").optional(),
  secondaryColor: z.string().regex(hexColorPattern, "Must be a valid hex color").optional(),
  accentColor: z.string().regex(hexColorPattern, "Must be a valid hex color").optional(),
  customDomain: z.string().max(253).nullable().optional(),
  emailLogoUrl: z.string().max(2048).nullable().optional(),
  emailPrimaryColor: z.string().regex(hexColorPattern, "Must be a valid hex color").optional(),
  emailFooterText: z.string().max(500).nullable().optional(),
});

export type WhiteLabelUpdateInput = z.infer<typeof whiteLabelUpdateInput>;
