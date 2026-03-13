import { z } from "zod";

const LOCALE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;

export const translationTranslateInput = z.object({
  entityType: z.enum(["IDEA", "CAMPAIGN", "COMMENT"]),
  entityId: z.string().cuid(),
  field: z.string().min(1).max(100),
  locale: z.string().regex(LOCALE_REGEX, "Invalid locale format (e.g. en, en-US)"),
  text: z.string().min(1),
  spaceId: z.string().cuid(),
});

export type TranslationTranslateInput = z.infer<typeof translationTranslateInput>;

export const translationBatchTranslateInput = z.object({
  items: z
    .array(
      z.object({
        entityType: z.enum(["IDEA", "CAMPAIGN", "COMMENT"]),
        entityId: z.string().cuid(),
        field: z.string().min(1).max(100),
        text: z.string().min(1),
      }),
    )
    .min(1)
    .max(50),
  targetLocale: z.string().regex(LOCALE_REGEX),
  spaceId: z.string().cuid(),
});

export type TranslationBatchTranslateInput = z.infer<typeof translationBatchTranslateInput>;

export const translationGetInput = z.object({
  entityType: z.enum(["IDEA", "CAMPAIGN", "COMMENT"]),
  entityId: z.string().cuid(),
  field: z.string().min(1).max(100),
  locale: z.string().regex(LOCALE_REGEX),
});

export type TranslationGetInput = z.infer<typeof translationGetInput>;

export const translationGetAllInput = z.object({
  entityType: z.enum(["IDEA", "CAMPAIGN", "COMMENT"]),
  entityId: z.string().cuid(),
  field: z.string().min(1).max(100).optional(),
});

export type TranslationGetAllInput = z.infer<typeof translationGetAllInput>;

export const translationUpdateInput = z.object({
  entityType: z.enum(["IDEA", "CAMPAIGN", "COMMENT"]),
  entityId: z.string().cuid(),
  field: z.string().min(1).max(100),
  locale: z.string().regex(LOCALE_REGEX),
  translatedText: z.string().min(1),
});

export type TranslationUpdateInput = z.infer<typeof translationUpdateInput>;

export const translationDeleteInput = z.object({
  entityType: z.enum(["IDEA", "CAMPAIGN", "COMMENT"]),
  entityId: z.string().cuid(),
  field: z.string().min(1).max(100),
  locale: z.string().regex(LOCALE_REGEX),
});

export type TranslationDeleteInput = z.infer<typeof translationDeleteInput>;

export const translationConfigureInput = z.object({
  spaceId: z.string().cuid(),
  defaultLocale: z.string().regex(LOCALE_REGEX).optional(),
  enabledLocales: z.array(z.string().regex(LOCALE_REGEX)).min(1).optional(),
  autoTranslateProvider: z.enum(["NONE", "DEEPL", "GOOGLE"]).optional(),
  apiKey: z.string().min(1).max(500).optional(),
  fallbackChain: z.record(z.string(), z.array(z.string())).optional(),
  maxRequestsPerHour: z.number().int().min(1).max(10000).optional(),
});

export type TranslationConfigureInput = z.infer<typeof translationConfigureInput>;

export const translationGetConfigInput = z.object({
  spaceId: z.string().cuid(),
});

export type TranslationGetConfigInput = z.infer<typeof translationGetConfigInput>;
