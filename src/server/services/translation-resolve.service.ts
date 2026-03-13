import { prisma } from "@/server/lib/prisma";

async function getConfigForSpace(spaceId: string) {
  const config = await prisma.translationConfig.findUnique({
    where: { spaceId },
  });
  return config;
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
