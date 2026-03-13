import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { createProvider } from "./translation-provider";
import type {
  TranslationTranslateInput,
  TranslationBatchTranslateInput,
  TranslationGetInput,
  TranslationGetAllInput,
  TranslationUpdateInput,
  TranslationDeleteInput,
  TranslationConfigureInput,
  TranslationGetConfigInput,
} from "./translation.schemas";

export {
  translationTranslateInput,
  translationBatchTranslateInput,
  translationGetInput,
  translationGetAllInput,
  translationUpdateInput,
  translationDeleteInput,
  translationConfigureInput,
  translationGetConfigInput,
} from "./translation.schemas";

export type {
  TranslationTranslateInput,
  TranslationBatchTranslateInput,
  TranslationGetInput,
  TranslationGetAllInput,
  TranslationUpdateInput,
  TranslationDeleteInput,
  TranslationConfigureInput,
  TranslationGetConfigInput,
} from "./translation.schemas";

const childLogger = logger.child({ service: "translation" });

export class TranslationServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TranslationServiceError";
  }
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(spaceId: string, maxPerHour: number): void {
  const now = Date.now();
  const entry = rateLimitMap.get(spaceId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(spaceId, { count: 1, resetAt: now + 3600_000 });
    return;
  }

  if (entry.count >= maxPerHour) {
    throw new TranslationServiceError(
      "RATE_LIMITED",
      `Translation rate limit exceeded. Max ${String(maxPerHour)} requests per hour per space.`,
    );
  }

  entry.count += 1;
}

async function getConfigForSpace(spaceId: string) {
  const config = await prisma.translationConfig.findUnique({
    where: { spaceId },
  });
  return config;
}

export async function translateContent(
  input: TranslationTranslateInput,
  actorId: string,
): Promise<{ id: string; translatedText: string; source: string }> {
  const config = await getConfigForSpace(input.spaceId);
  const maxPerHour = config?.maxRequestsPerHour ?? 100;
  checkRateLimit(input.spaceId, maxPerHour);

  let translatedText: string;
  let source: "MANUAL" | "DEEPL" | "GOOGLE" = "MANUAL";

  if (config && config.autoTranslateProvider !== "NONE" && config.apiKeyEncrypted) {
    const provider = createProvider(
      config.autoTranslateProvider as "DEEPL" | "GOOGLE",
      config.apiKeyEncrypted,
    );
    translatedText = await provider.translate(input.text, input.locale, config.defaultLocale);
    source = config.autoTranslateProvider as "DEEPL" | "GOOGLE";
  } else {
    translatedText = input.text;
  }

  const translation = await prisma.contentTranslation.upsert({
    where: {
      entityType_entityId_field_locale: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        locale: input.locale,
      },
    },
    update: {
      translatedText,
      source,
      translatedById: actorId,
    },
    create: {
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      locale: input.locale,
      translatedText,
      source,
      translatedById: actorId,
    },
  });

  childLogger.info(
    { translationId: translation.id, entityType: input.entityType, locale: input.locale },
    "Translation created",
  );

  eventBus.emit("translation.created", {
    entity: "ContentTranslation",
    entityId: translation.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      locale: input.locale,
      source,
    },
  });

  return {
    id: translation.id,
    translatedText: translation.translatedText,
    source: translation.source,
  };
}

export async function batchTranslate(
  input: TranslationBatchTranslateInput,
  actorId: string,
): Promise<Array<{ entityId: string; field: string; translatedText: string; source: string }>> {
  const config = await getConfigForSpace(input.spaceId);
  const maxPerHour = config?.maxRequestsPerHour ?? 100;
  checkRateLimit(input.spaceId, maxPerHour);

  const useProvider = config && config.autoTranslateProvider !== "NONE" && config.apiKeyEncrypted;

  let translatedTexts: string[];

  if (useProvider) {
    const provider = createProvider(
      config.autoTranslateProvider as "DEEPL" | "GOOGLE",
      config.apiKeyEncrypted!,
    );
    translatedTexts = await provider.batchTranslate(
      input.items.map((item) => item.text),
      input.targetLocale,
      config.defaultLocale,
    );
  } else {
    translatedTexts = input.items.map((item) => item.text);
  }

  const source = useProvider ? (config.autoTranslateProvider as "DEEPL" | "GOOGLE") : "MANUAL";

  const results = await Promise.all(
    input.items.map(async (item, index) => {
      const translation = await prisma.contentTranslation.upsert({
        where: {
          entityType_entityId_field_locale: {
            entityType: item.entityType,
            entityId: item.entityId,
            field: item.field,
            locale: input.targetLocale,
          },
        },
        update: {
          translatedText: translatedTexts[index],
          source,
          translatedById: actorId,
        },
        create: {
          entityType: item.entityType,
          entityId: item.entityId,
          field: item.field,
          locale: input.targetLocale,
          translatedText: translatedTexts[index],
          source,
          translatedById: actorId,
        },
      });

      return {
        entityId: item.entityId,
        field: item.field,
        translatedText: translation.translatedText,
        source: translation.source,
      };
    }),
  );

  childLogger.info(
    { count: results.length, targetLocale: input.targetLocale },
    "Batch translation completed",
  );

  return results;
}

export async function getTranslation(input: TranslationGetInput): Promise<{
  id: string;
  translatedText: string;
  source: string;
  locale: string;
} | null> {
  const translation = await prisma.contentTranslation.findUnique({
    where: {
      entityType_entityId_field_locale: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        locale: input.locale,
      },
    },
  });

  if (!translation) return null;

  return {
    id: translation.id,
    translatedText: translation.translatedText,
    source: translation.source,
    locale: translation.locale,
  };
}

export async function getTranslations(input: TranslationGetAllInput): Promise<
  Array<{
    id: string;
    field: string;
    locale: string;
    translatedText: string;
    source: string;
  }>
> {
  const where: Record<string, unknown> = {
    entityType: input.entityType,
    entityId: input.entityId,
  };

  if (input.field) {
    where.field = input.field;
  }

  const translations = await prisma.contentTranslation.findMany({ where });

  return translations.map((t) => ({
    id: t.id,
    field: t.field,
    locale: t.locale,
    translatedText: t.translatedText,
    source: t.source,
  }));
}

export async function updateTranslation(
  input: TranslationUpdateInput,
  actorId: string,
): Promise<{ id: string; translatedText: string }> {
  const existing = await prisma.contentTranslation.findUnique({
    where: {
      entityType_entityId_field_locale: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        locale: input.locale,
      },
    },
  });

  if (!existing) {
    throw new TranslationServiceError("NOT_FOUND", "Translation not found");
  }

  const updated = await prisma.contentTranslation.update({
    where: { id: existing.id },
    data: {
      translatedText: input.translatedText,
      source: "MANUAL",
      translatedById: actorId,
    },
  });

  childLogger.info({ translationId: updated.id }, "Translation updated");

  eventBus.emit("translation.updated", {
    entity: "ContentTranslation",
    entityId: updated.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      locale: input.locale,
    },
  });

  return { id: updated.id, translatedText: updated.translatedText };
}

export async function deleteTranslation(
  input: TranslationDeleteInput,
  actorId: string,
): Promise<{ success: true }> {
  const existing = await prisma.contentTranslation.findUnique({
    where: {
      entityType_entityId_field_locale: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        locale: input.locale,
      },
    },
  });

  if (!existing) {
    throw new TranslationServiceError("NOT_FOUND", "Translation not found");
  }

  await prisma.contentTranslation.delete({ where: { id: existing.id } });

  childLogger.info({ translationId: existing.id, actorId }, "Translation deleted");

  return { success: true };
}

export async function configureTranslation(
  input: TranslationConfigureInput,
  actorId: string,
): Promise<{
  id: string;
  spaceId: string;
  defaultLocale: string;
  enabledLocales: string[];
  autoTranslateProvider: string;
}> {
  const data: Record<string, unknown> = {};

  if (input.defaultLocale !== undefined) data.defaultLocale = input.defaultLocale;
  if (input.enabledLocales !== undefined) data.enabledLocales = input.enabledLocales;
  if (input.autoTranslateProvider !== undefined)
    data.autoTranslateProvider = input.autoTranslateProvider;
  if (input.apiKey !== undefined) data.apiKeyEncrypted = input.apiKey;
  if (input.fallbackChain !== undefined) data.fallbackChain = input.fallbackChain;
  if (input.maxRequestsPerHour !== undefined) data.maxRequestsPerHour = input.maxRequestsPerHour;

  const config = await prisma.translationConfig.upsert({
    where: { spaceId: input.spaceId },
    update: data,
    create: {
      spaceId: input.spaceId,
      defaultLocale: input.defaultLocale ?? "en",
      enabledLocales: input.enabledLocales ?? ["en"],
      autoTranslateProvider: input.autoTranslateProvider ?? "NONE",
      apiKeyEncrypted: input.apiKey ?? null,
      fallbackChain: input.fallbackChain ?? {},
      maxRequestsPerHour: input.maxRequestsPerHour ?? 100,
    },
  });

  childLogger.info(
    { configId: config.id, spaceId: input.spaceId, actorId },
    "Translation configuration updated",
  );

  return {
    id: config.id,
    spaceId: config.spaceId,
    defaultLocale: config.defaultLocale,
    enabledLocales: config.enabledLocales,
    autoTranslateProvider: config.autoTranslateProvider,
  };
}

export async function getConfig(input: TranslationGetConfigInput): Promise<{
  id: string;
  spaceId: string;
  defaultLocale: string;
  enabledLocales: string[];
  autoTranslateProvider: string;
  fallbackChain: unknown;
  maxRequestsPerHour: number;
  hasApiKey: boolean;
} | null> {
  const config = await prisma.translationConfig.findUnique({
    where: { spaceId: input.spaceId },
  });

  if (!config) return null;

  return {
    id: config.id,
    spaceId: config.spaceId,
    defaultLocale: config.defaultLocale,
    enabledLocales: config.enabledLocales,
    autoTranslateProvider: config.autoTranslateProvider,
    fallbackChain: config.fallbackChain,
    maxRequestsPerHour: config.maxRequestsPerHour,
    hasApiKey: Boolean(config.apiKeyEncrypted),
  };
}

export async function resolveContent(
  entityType: "IDEA" | "CAMPAIGN" | "COMMENT",
  entityId: string,
  field: string,
  locale: string,
  originalText: string,
  spaceId?: string,
): Promise<{ text: string; locale: string; source: "original" | "translation" }> {
  const direct = await prisma.contentTranslation.findUnique({
    where: {
      entityType_entityId_field_locale: {
        entityType,
        entityId,
        field,
        locale,
      },
    },
  });

  if (direct) {
    return { text: direct.translatedText, locale, source: "translation" };
  }

  if (spaceId) {
    const config = await getConfigForSpace(spaceId);
    if (config) {
      const chain = config.fallbackChain as Record<string, string[]>;
      const fallbacks = chain[locale];
      if (fallbacks) {
        for (const fallbackLocale of fallbacks) {
          const fallback = await prisma.contentTranslation.findUnique({
            where: {
              entityType_entityId_field_locale: {
                entityType,
                entityId,
                field,
                locale: fallbackLocale,
              },
            },
          });
          if (fallback) {
            return {
              text: fallback.translatedText,
              locale: fallbackLocale,
              source: "translation",
            };
          }
        }
      }
    }
  }

  return { text: originalText, locale, source: "original" };
}
