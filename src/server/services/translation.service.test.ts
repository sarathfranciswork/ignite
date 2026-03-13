import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  translateContent,
  batchTranslate,
  getTranslation,
  getTranslations,
  updateTranslation,
  deleteTranslation,
  configureTranslation,
  getConfig,
  resolveContent,
  TranslationServiceError,
} from "./translation.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    contentTranslation: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    translationConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

vi.mock("./translation-provider", () => ({
  createProvider: vi.fn(() => ({
    translate: vi.fn().mockResolvedValue("translated text"),
    batchTranslate: vi.fn().mockResolvedValue(["translated 1", "translated 2"]),
  })),
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const mockTranslation = {
  id: "trans-1",
  entityType: "IDEA",
  entityId: "idea-1",
  field: "title",
  locale: "de",
  translatedText: "Übersetzter Titel",
  source: "MANUAL",
  translatedById: "user-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockConfig = {
  id: "config-1",
  spaceId: "space-1",
  defaultLocale: "en",
  enabledLocales: ["en", "de", "fr"],
  autoTranslateProvider: "NONE",
  apiKeyEncrypted: null,
  fallbackChain: {},
  maxRequestsPerHour: 100,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("TranslationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("translateContent", () => {
    it("should create a manual translation when no provider is configured", async () => {
      (prisma.translationConfig.findUnique as Mock).mockResolvedValue(mockConfig);
      (prisma.contentTranslation.upsert as Mock).mockResolvedValue(mockTranslation);

      const result = await translateContent(
        {
          entityType: "IDEA",
          entityId: "idea-1",
          field: "title",
          locale: "de",
          text: "Test Title",
          spaceId: "space-1",
        },
        "user-1",
      );

      expect(result.id).toBe("trans-1");
      expect(result.translatedText).toBe("Übersetzter Titel");
      expect(result.source).toBe("MANUAL");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "translation.created",
        expect.objectContaining({
          entity: "ContentTranslation",
          entityId: "trans-1",
          actor: "user-1",
        }),
      );
    });

    it("should use auto-translate when provider is configured", async () => {
      const configWithProvider = {
        ...mockConfig,
        autoTranslateProvider: "DEEPL",
        apiKeyEncrypted: "fake-key",
      };
      (prisma.translationConfig.findUnique as Mock).mockResolvedValue(configWithProvider);
      (prisma.contentTranslation.upsert as Mock).mockResolvedValue({
        ...mockTranslation,
        source: "DEEPL",
        translatedText: "translated text",
      });

      const result = await translateContent(
        {
          entityType: "IDEA",
          entityId: "idea-1",
          field: "title",
          locale: "de",
          text: "Test Title",
          spaceId: "space-1",
        },
        "user-1",
      );

      expect(result.source).toBe("DEEPL");
    });

    it("should enforce rate limiting", async () => {
      const configWithLowLimit = { ...mockConfig, maxRequestsPerHour: 1 };
      (prisma.translationConfig.findUnique as Mock).mockResolvedValue(configWithLowLimit);
      (prisma.contentTranslation.upsert as Mock).mockResolvedValue(mockTranslation);

      // First call succeeds
      await translateContent(
        {
          entityType: "IDEA",
          entityId: "idea-1",
          field: "title",
          locale: "de",
          text: "Test",
          spaceId: "rate-limit-space",
        },
        "user-1",
      );

      // Second call should be rate limited
      await expect(
        translateContent(
          {
            entityType: "IDEA",
            entityId: "idea-2",
            field: "title",
            locale: "de",
            text: "Test 2",
            spaceId: "rate-limit-space",
          },
          "user-1",
        ),
      ).rejects.toThrow(TranslationServiceError);
    });
  });

  describe("batchTranslate", () => {
    it("should translate multiple items", async () => {
      (prisma.translationConfig.findUnique as Mock).mockResolvedValue(mockConfig);
      (prisma.contentTranslation.upsert as Mock)
        .mockResolvedValueOnce({ ...mockTranslation, entityId: "idea-1" })
        .mockResolvedValueOnce({
          ...mockTranslation,
          id: "trans-2",
          entityId: "idea-2",
          translatedText: "Zweiter Titel",
        });

      const result = await batchTranslate(
        {
          items: [
            { entityType: "IDEA", entityId: "idea-1", field: "title", text: "Title 1" },
            { entityType: "IDEA", entityId: "idea-2", field: "title", text: "Title 2" },
          ],
          targetLocale: "de",
          spaceId: "space-1",
        },
        "user-1",
      );

      expect(result).toHaveLength(2);
      expect(result[0].entityId).toBe("idea-1");
      expect(result[1].entityId).toBe("idea-2");
    });
  });

  describe("getTranslation", () => {
    it("should return a translation by unique key", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(mockTranslation);

      const result = await getTranslation({
        entityType: "IDEA",
        entityId: "idea-1",
        field: "title",
        locale: "de",
      });

      expect(result).toEqual({
        id: "trans-1",
        translatedText: "Übersetzter Titel",
        source: "MANUAL",
        locale: "de",
      });
    });

    it("should return null when translation does not exist", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(null);

      const result = await getTranslation({
        entityType: "IDEA",
        entityId: "idea-999",
        field: "title",
        locale: "de",
      });

      expect(result).toBeNull();
    });
  });

  describe("getTranslations", () => {
    it("should return all translations for an entity", async () => {
      (prisma.contentTranslation.findMany as Mock).mockResolvedValue([
        mockTranslation,
        { ...mockTranslation, id: "trans-2", locale: "fr", translatedText: "Titre traduit" },
      ]);

      const result = await getTranslations({
        entityType: "IDEA",
        entityId: "idea-1",
      });

      expect(result).toHaveLength(2);
      expect(result[0].locale).toBe("de");
      expect(result[1].locale).toBe("fr");
    });

    it("should filter by field when provided", async () => {
      (prisma.contentTranslation.findMany as Mock).mockResolvedValue([mockTranslation]);

      await getTranslations({
        entityType: "IDEA",
        entityId: "idea-1",
        field: "title",
      });

      expect(prisma.contentTranslation.findMany).toHaveBeenCalledWith({
        where: {
          entityType: "IDEA",
          entityId: "idea-1",
          field: "title",
        },
      });
    });
  });

  describe("updateTranslation", () => {
    it("should update an existing translation", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(mockTranslation);
      (prisma.contentTranslation.update as Mock).mockResolvedValue({
        ...mockTranslation,
        translatedText: "Aktualisierter Titel",
      });

      const result = await updateTranslation(
        {
          entityType: "IDEA",
          entityId: "idea-1",
          field: "title",
          locale: "de",
          translatedText: "Aktualisierter Titel",
        },
        "user-1",
      );

      expect(result.translatedText).toBe("Aktualisierter Titel");
      expect(eventBus.emit).toHaveBeenCalledWith(
        "translation.updated",
        expect.objectContaining({ entityId: "trans-1" }),
      );
    });

    it("should throw NOT_FOUND when translation does not exist", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(null);

      await expect(
        updateTranslation(
          {
            entityType: "IDEA",
            entityId: "idea-999",
            field: "title",
            locale: "de",
            translatedText: "test",
          },
          "user-1",
        ),
      ).rejects.toThrow("Translation not found");
    });
  });

  describe("deleteTranslation", () => {
    it("should delete a translation", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(mockTranslation);
      (prisma.contentTranslation.delete as Mock).mockResolvedValue(mockTranslation);

      const result = await deleteTranslation(
        {
          entityType: "IDEA",
          entityId: "idea-1",
          field: "title",
          locale: "de",
        },
        "user-1",
      );

      expect(result).toEqual({ success: true });
    });

    it("should throw NOT_FOUND when translation does not exist", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(null);

      await expect(
        deleteTranslation(
          {
            entityType: "IDEA",
            entityId: "idea-999",
            field: "title",
            locale: "de",
          },
          "user-1",
        ),
      ).rejects.toThrow("Translation not found");
    });
  });

  describe("configureTranslation", () => {
    it("should upsert translation config", async () => {
      (prisma.translationConfig.upsert as Mock).mockResolvedValue(mockConfig);

      const result = await configureTranslation(
        {
          spaceId: "space-1",
          defaultLocale: "en",
          enabledLocales: ["en", "de", "fr"],
          autoTranslateProvider: "NONE",
        },
        "user-1",
      );

      expect(result.spaceId).toBe("space-1");
      expect(result.defaultLocale).toBe("en");
      expect(result.enabledLocales).toEqual(["en", "de", "fr"]);
    });
  });

  describe("getConfig", () => {
    it("should return config with hasApiKey flag", async () => {
      (prisma.translationConfig.findUnique as Mock).mockResolvedValue({
        ...mockConfig,
        apiKeyEncrypted: "secret",
      });

      const result = await getConfig({ spaceId: "space-1" });

      expect(result).toBeDefined();
      expect(result!.hasApiKey).toBe(true);
      expect(result!.defaultLocale).toBe("en");
    });

    it("should return null when config does not exist", async () => {
      (prisma.translationConfig.findUnique as Mock).mockResolvedValue(null);

      const result = await getConfig({ spaceId: "space-999" });

      expect(result).toBeNull();
    });
  });

  describe("resolveContent", () => {
    it("should return translation when available", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(mockTranslation);

      const result = await resolveContent("IDEA", "idea-1", "title", "de", "Original Title");

      expect(result.text).toBe("Übersetzter Titel");
      expect(result.source).toBe("translation");
    });

    it("should return original text when no translation exists", async () => {
      (prisma.contentTranslation.findUnique as Mock).mockResolvedValue(null);

      const result = await resolveContent("IDEA", "idea-1", "title", "de", "Original Title");

      expect(result.text).toBe("Original Title");
      expect(result.source).toBe("original");
    });

    it("should follow fallback chain when direct translation not found", async () => {
      (prisma.contentTranslation.findUnique as Mock)
        .mockResolvedValueOnce(null) // direct locale not found
        .mockResolvedValueOnce({
          ...mockTranslation,
          locale: "en",
          translatedText: "English Fallback",
        }); // fallback found

      (prisma.translationConfig.findUnique as Mock).mockResolvedValue({
        ...mockConfig,
        fallbackChain: { de: ["en"] },
      });

      const result = await resolveContent("IDEA", "idea-1", "title", "de", "Original", "space-1");

      expect(result.text).toBe("English Fallback");
      expect(result.locale).toBe("en");
      expect(result.source).toBe("translation");
    });
  });
});
