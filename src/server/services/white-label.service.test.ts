import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getWhiteLabelConfig,
  getPublicWhiteLabelConfig,
  getEmailThemeConfig,
  updateWhiteLabelConfig,
  resetWhiteLabelConfig,
  WhiteLabelServiceError,
} from "./white-label.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    whiteLabelConfig: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  eventBus: {
    emit: vi.fn(),
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");

const configFindFirst = prisma.whiteLabelConfig.findFirst as unknown as Mock;
const configFindUnique = prisma.whiteLabelConfig.findUnique as unknown as Mock;
const configCreate = prisma.whiteLabelConfig.create as unknown as Mock;
const configUpdate = prisma.whiteLabelConfig.update as unknown as Mock;
const configDelete = prisma.whiteLabelConfig.delete as unknown as Mock;

const MOCK_CONFIG = {
  id: "cfg-1",
  platformName: "TestPlatform",
  logoUrl: "https://example.com/logo.png",
  logoSmallUrl: null,
  faviconUrl: null,
  loginBannerUrl: null,
  primaryColor: "#FF0000",
  secondaryColor: "#00FF00",
  accentColor: "#0000FF",
  customDomain: "test.example.com",
  emailLogoUrl: null,
  emailPrimaryColor: "#FF0000",
  emailFooterText: "Test footer",
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

describe("white-label.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getWhiteLabelConfig", () => {
    it("returns existing config when found", async () => {
      configFindFirst.mockResolvedValue(MOCK_CONFIG);

      const result = await getWhiteLabelConfig();

      expect(result).toEqual(MOCK_CONFIG);
      expect(configFindFirst).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("returns default config when none exists", async () => {
      configFindFirst.mockResolvedValue(null);

      const result = await getWhiteLabelConfig();

      expect(result.id).toBe("default");
      expect(result.platformName).toBe("Ignite");
      expect(result.primaryColor).toBe("#6366F1");
    });
  });

  describe("getPublicWhiteLabelConfig", () => {
    it("returns only public-facing fields", async () => {
      configFindFirst.mockResolvedValue(MOCK_CONFIG);

      const result = await getPublicWhiteLabelConfig();

      expect(result).toEqual({
        platformName: "TestPlatform",
        logoUrl: "https://example.com/logo.png",
        logoSmallUrl: null,
        faviconUrl: null,
        loginBannerUrl: null,
        primaryColor: "#FF0000",
        secondaryColor: "#00FF00",
        accentColor: "#0000FF",
      });
      expect(result).not.toHaveProperty("customDomain");
      expect(result).not.toHaveProperty("emailLogoUrl");
    });
  });

  describe("getEmailThemeConfig", () => {
    it("returns email theme with dedicated email logo", async () => {
      configFindFirst.mockResolvedValue({
        ...MOCK_CONFIG,
        emailLogoUrl: "https://example.com/email-logo.png",
      });

      const result = await getEmailThemeConfig();

      expect(result.logoUrl).toBe("https://example.com/email-logo.png");
      expect(result.primaryColor).toBe("#FF0000");
      expect(result.footerText).toBe("Test footer");
    });

    it("falls back to main logo when email logo not set", async () => {
      configFindFirst.mockResolvedValue(MOCK_CONFIG);

      const result = await getEmailThemeConfig();

      expect(result.logoUrl).toBe("https://example.com/logo.png");
    });
  });

  describe("updateWhiteLabelConfig", () => {
    it("updates existing config", async () => {
      configFindFirst.mockResolvedValue(MOCK_CONFIG);
      configFindUnique.mockResolvedValue(null);
      const updated = { ...MOCK_CONFIG, platformName: "NewName" };
      configUpdate.mockResolvedValue(updated);

      const result = await updateWhiteLabelConfig({ platformName: "NewName" }, "user-1");

      expect(result.platformName).toBe("NewName");
      expect(configUpdate).toHaveBeenCalledWith({
        where: { id: "cfg-1" },
        data: { platformName: "NewName" },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "whiteLabel.updated",
        expect.objectContaining({
          entity: "WhiteLabelConfig",
          entityId: "cfg-1",
          actor: "user-1",
        }),
      );
    });

    it("creates new config when none exists", async () => {
      configFindFirst.mockResolvedValue(null);
      const created = { ...MOCK_CONFIG, id: "cfg-new" };
      configCreate.mockResolvedValue(created);

      const result = await updateWhiteLabelConfig(
        { platformName: "NewPlatform", primaryColor: "#123456" },
        "user-1",
      );

      expect(result).toEqual(created);
      expect(configCreate).toHaveBeenCalledWith({
        data: {
          platformName: "NewPlatform",
          primaryColor: "#123456",
          isActive: true,
        },
      });
    });

    it("throws DOMAIN_CONFLICT when domain is in use", async () => {
      configFindFirst.mockResolvedValue(MOCK_CONFIG);
      configFindUnique.mockResolvedValue({ ...MOCK_CONFIG, id: "cfg-other" });

      await expect(
        updateWhiteLabelConfig({ customDomain: "test.example.com" }, "user-1"),
      ).rejects.toThrow(WhiteLabelServiceError);

      await expect(
        updateWhiteLabelConfig({ customDomain: "test.example.com" }, "user-1"),
      ).rejects.toMatchObject({ code: "DOMAIN_CONFLICT" });
    });

    it("allows same domain for same config", async () => {
      configFindFirst.mockResolvedValue(MOCK_CONFIG);
      configFindUnique.mockResolvedValue(MOCK_CONFIG);
      configUpdate.mockResolvedValue(MOCK_CONFIG);

      const result = await updateWhiteLabelConfig({ customDomain: "test.example.com" }, "user-1");

      expect(result).toEqual(MOCK_CONFIG);
    });
  });

  describe("resetWhiteLabelConfig", () => {
    it("deletes existing config and returns defaults", async () => {
      configFindFirst.mockResolvedValueOnce(MOCK_CONFIG).mockResolvedValueOnce(null);

      const result = await resetWhiteLabelConfig("user-1");

      expect(configDelete).toHaveBeenCalledWith({ where: { id: "cfg-1" } });
      expect(result.id).toBe("default");
      expect(result.platformName).toBe("Ignite");
    });

    it("returns defaults even if no config exists", async () => {
      configFindFirst.mockResolvedValue(null);

      const result = await resetWhiteLabelConfig("user-1");

      expect(configDelete).not.toHaveBeenCalled();
      expect(result.platformName).toBe("Ignite");
    });
  });
});
