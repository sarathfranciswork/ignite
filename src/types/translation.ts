import { z } from "zod";

const LOCALE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

export const translationConfigureFormSchema = z.object({
  spaceId: z.string().cuid(),
  defaultLocale: z.string().regex(LOCALE_REGEX).optional(),
  enabledLocales: z.array(z.string().regex(LOCALE_REGEX)).min(1).optional(),
  autoTranslateProvider: z.enum(["NONE", "DEEPL", "GOOGLE"]).optional(),
  apiKey: z.string().min(1).max(500).optional(),
  maxRequestsPerHour: z.number().int().min(1).max(10000).optional(),
});

export type TranslationConfigureFormValues = z.infer<typeof translationConfigureFormSchema>;
