import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    twoFactorAuth: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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
  },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("$2a$12$hashedbackupcode"),
  compare: vi.fn().mockResolvedValue(false),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqrcode"),
  },
}));

// Set TOTP_ENCRYPTION_KEY before importing service
process.env.TOTP_ENCRYPTION_KEY = "test-encryption-key-for-unit-tests-32chars";

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const { generateSecret, verifyAndEnable, disableTwoFactor, getTwoFactorStatus } =
  await import("./totp.service");
const OTPAuth = await import("otpauth");

const twoFactorFindUnique = prisma.twoFactorAuth.findUnique as unknown as Mock;
const twoFactorUpsert = prisma.twoFactorAuth.upsert as unknown as Mock;
const twoFactorUpdate = prisma.twoFactorAuth.update as unknown as Mock;
const twoFactorDelete = prisma.twoFactorAuth.delete as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;

describe("totp.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSecret", () => {
    it("generates a TOTP secret and QR code for a user", async () => {
      userFindUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      twoFactorFindUnique.mockResolvedValue(null);
      twoFactorUpsert.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        isEnabled: false,
      });

      const result = await generateSecret({ userId: "user-1" });

      expect(result.qrCodeDataUri).toContain("data:image/png");
      expect(result.secret).toBeTruthy();
      expect(result.otpauthUri).toContain("otpauth://totp/");
      expect(twoFactorUpsert).toHaveBeenCalled();
    });

    it("throws if user not found", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(generateSecret({ userId: "nonexistent" })).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("throws if 2FA is already enabled", async () => {
      userFindUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      twoFactorFindUnique.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        isEnabled: true,
      });

      await expect(generateSecret({ userId: "user-1" })).rejects.toMatchObject({
        code: "ALREADY_ENABLED",
      });
    });
  });

  describe("verifyAndEnable", () => {
    it("enables 2FA after valid TOTP code", async () => {
      userFindUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      });
      twoFactorFindUnique.mockResolvedValue(null);
      twoFactorUpsert.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        isEnabled: false,
      });

      const setupResult = await generateSecret({ userId: "user-1" });

      // Generate a valid TOTP code from the secret
      const totp = new OTPAuth.TOTP({
        issuer: "Ignite",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(setupResult.secret),
      });
      const validCode = totp.generate();

      // Get the encrypted secret that was stored
      const upsertCall = twoFactorUpsert.mock.calls[0];
      const encryptedSecret = upsertCall[0].create.secret;

      twoFactorFindUnique.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        secret: encryptedSecret,
        isEnabled: false,
        backupCodes: [],
      });

      twoFactorUpdate.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        isEnabled: true,
      });

      const result = await verifyAndEnable({ userId: "user-1", totpCode: validCode });

      expect(result.backupCodes).toHaveLength(10);
      expect(twoFactorUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          data: expect.objectContaining({
            isEnabled: true,
          }),
        }),
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        "twoFactor.enabled",
        expect.objectContaining({
          entity: "user",
          entityId: "user-1",
        }),
      );
    });

    it("throws if 2FA not set up", async () => {
      twoFactorFindUnique.mockResolvedValue(null);

      await expect(verifyAndEnable({ userId: "user-1", totpCode: "123456" })).rejects.toMatchObject(
        {
          code: "NOT_SETUP",
        },
      );
    });

    it("throws if already enabled", async () => {
      twoFactorFindUnique.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        secret: "some:encrypted:secret",
        isEnabled: true,
        backupCodes: [],
      });

      await expect(verifyAndEnable({ userId: "user-1", totpCode: "123456" })).rejects.toMatchObject(
        {
          code: "ALREADY_ENABLED",
        },
      );
    });
  });

  describe("disableTwoFactor", () => {
    it("disables 2FA for a user", async () => {
      twoFactorFindUnique.mockResolvedValue({
        id: "tfa-1",
        userId: "user-1",
        isEnabled: true,
      });
      twoFactorDelete.mockResolvedValue({
        id: "tfa-1",
      });

      const result = await disableTwoFactor({ userId: "user-1" });

      expect(result.success).toBe(true);
      expect(twoFactorDelete).toHaveBeenCalledWith({
        where: { userId: "user-1" },
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "twoFactor.disabled",
        expect.objectContaining({
          entity: "user",
          entityId: "user-1",
        }),
      );
    });

    it("throws if 2FA not set up", async () => {
      twoFactorFindUnique.mockResolvedValue(null);

      await expect(disableTwoFactor({ userId: "user-1" })).rejects.toMatchObject({
        code: "NOT_SETUP",
      });
    });
  });

  describe("getTwoFactorStatus", () => {
    it("returns enabled status", async () => {
      twoFactorFindUnique.mockResolvedValue({
        isEnabled: true,
        verifiedAt: new Date("2024-01-01"),
      });

      const result = await getTwoFactorStatus("user-1");

      expect(result.isEnabled).toBe(true);
      expect(result.verifiedAt).toEqual(new Date("2024-01-01"));
    });

    it("returns disabled status when no record", async () => {
      twoFactorFindUnique.mockResolvedValue(null);

      const result = await getTwoFactorStatus("user-1");

      expect(result.isEnabled).toBe(false);
      expect(result.verifiedAt).toBeNull();
    });
  });
});
