import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { cacheGet, cacheSet } from "@/server/lib/redis";
import { decrypt } from "@/server/lib/encryption";
import { createProvider } from "./translation-provider";
import type {
  TranslationTranslateInput,
  TranslationBatchTranslateInput,
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

export { resolveContent } from "./translation-resolve.service";
export {
  getTranslation,
  getTranslations,
  updateTranslation,
  deleteTranslation,
  configureTranslation,
  getConfig,
} from "./translation-crud.service";

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

const RATE_LIMIT_TTL_SECONDS = 3600;

async function checkRateLimit(spaceId: string, maxPerHour: number): Promise<void> {
  const key = `translation:ratelimit:${spaceId}`;
  const current = await cacheGet(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= maxPerHour) {
    throw new TranslationServiceError(
      "RATE_LIMITED",
      `Translation rate limit exceeded. Max ${String(maxPerHour)} requests per hour per space.`,
    );
  }

  await cacheSet(key, String(count + 1), RATE_LIMIT_TTL_SECONDS);
}

async function getConfigForSpace(spaceId: string) {
  const config = await prisma.translationConfig.findUnique({
    where: { spaceId },
  });
  return config;
}

function decryptApiKey(encryptedKey: string): string {
  return decrypt(encryptedKey);
}

export async function translateContent(
  input: TranslationTranslateInput,
  actorId: string,
): Promise<{ id: string; translatedText: string; source: string }> {
  const config = await getConfigForSpace(input.spaceId);
  const maxPerHour = config?.maxRequestsPerHour ?? 100;
  await checkRateLimit(input.spaceId, maxPerHour);

  let translatedText: string;
  let source: "MANUAL" | "DEEPL" | "GOOGLE" = "MANUAL";

  if (config && config.autoTranslateProvider !== "NONE" && config.apiKeyEncrypted) {
    const apiKey = decryptApiKey(config.apiKeyEncrypted);
    const provider = createProvider(config.autoTranslateProvider as "DEEPL" | "GOOGLE", apiKey);
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
  await checkRateLimit(input.spaceId, maxPerHour);

  let translatedTexts: string[];
  let source: "MANUAL" | "DEEPL" | "GOOGLE" = "MANUAL";

  if (config && config.autoTranslateProvider !== "NONE" && config.apiKeyEncrypted) {
    const apiKey = decryptApiKey(config.apiKeyEncrypted);
    const provider = createProvider(config.autoTranslateProvider as "DEEPL" | "GOOGLE", apiKey);
    translatedTexts = await provider.batchTranslate(
      input.items.map((item) => item.text),
      input.targetLocale,
      config.defaultLocale,
    );
    source = config.autoTranslateProvider as "DEEPL" | "GOOGLE";
  } else {
    translatedTexts = input.items.map((item) => item.text);
  }

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
