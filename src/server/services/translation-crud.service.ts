import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import { encrypt } from "@/server/lib/encryption";
import { TranslationServiceError } from "./translation.service";
import type {
  TranslationGetInput,
  TranslationGetAllInput,
  TranslationUpdateInput,
  TranslationDeleteInput,
  TranslationConfigureInput,
  TranslationGetConfigInput,
} from "./translation.schemas";

const childLogger = logger.child({ service: "translation-crud" });

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
  if (input.apiKey !== undefined) data.apiKeyEncrypted = encrypt(input.apiKey);
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
      apiKeyEncrypted: input.apiKey ? encrypt(input.apiKey) : null,
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
