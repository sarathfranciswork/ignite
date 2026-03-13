import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  generateSecret,
  verifyAndEnable,
  verifyCode,
  disableTwoFactor,
  regenerateBackupCodes,
  getTwoFactorStatus,
  TotpServiceError,
  generateSecretInput,
  verifyAndEnableInput,
  verifyCodeInput,
} from "./totp.service";

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

vi.mock("@/server/lib/env", () => ({
  env: {
    TOTP_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
}));

const { prisma } = await import("@/server/lib/prisma");
const { eventBus } = await import("@/server/events/event-bus");
const envModule = (await import("@/server/lib/env")) as { env: Record<string, string | undefined> };

const userFindUnique = prisma.user.findUnique as unknown as Mock;
const prismaMock = prisma as unknown as Record<string, Record<string, Mock>>;
const tfaFindUnique = prismaMock.twoFactorAuth.findUnique as Mock;
const tfaUpsert = prismaMock.twoFactorAuth.upsert as Mock;
const tfaUpdate = prismaMock.twoFactorAuth.update as Mock;
const tfaDelete = prismaMock.twoFactorAuth.delete as Mock;

describe("totp.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOTP_ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  describe("input schemas", () => {
    it("validates generateSecretInput", () => {
      expect(generateSecretInput.safeParse({ userId: "user-1" }).success).toBe(true);
      expect(generateSecretInput.safeParse({ userId: "" }).success).toBe(false);
      expect(generateSecretInput.safeParse({}).success).toBe(false);
    });

    it("validates verifyAndEnableInput", () => {
      expect(verifyAndEnableInput.safeParse({ userId: "user-1", totpCode: "123456" }).success).toBe(
        true,
      );
      expect(verifyAndEnableInput.safeParse({ userId: "user-1", totpCode: "12345" }).success).toBe(
        false,
      );
      expect(
        verifyAndEnableInput.safeParse({ userId: "user-1", totpCode: "1234567" }).success,
      ).toBe(false);
    });

    it("validates verifyCodeInput", () => {
      expect(verifyCodeInput.safeParse({ userId: "user-1", code: "123456" }).success).toBe(true);
      expect(verifyCodeInput.safeParse({ userId: "user-1", code: "" }).success).toBe(false);
    });
  });

  describe("generateSecret", () => {
    it("generates a TOTP secret for an existing user", async () => {
      userFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      tfaFindUnique.mockResolvedValue(null);
      tfaUpsert.mockResolvedValue({ id: "tfa-1", userId: "user-1" });

      const result = await generateSecret({ userId: "user-1" });

      expect(result.qrCodeDataUri).toMatch(/^data:image\/png;base64,/);
      expect(result.secret).toBeTruthy();
      expect(result.otpauthUri).toContain("otpauth://totp/");
      expect(tfaUpsert).toHaveBeenCalled();
    });

    it("throws USER_NOT_FOUND if user does not exist", async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(generateSecret({ userId: "nonexistent" })).rejects.toThrow(TotpServiceError);
      await expect(generateSecret({ userId: "nonexistent" })).rejects.toMatchObject({
        code: "USER_NOT_FOUND",
      });
    });

    it("throws ALREADY_ENABLED if 2FA is already enabled", async () => {
      userFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      tfaFindUnique.mockResolvedValue({ userId: "user-1", isEnabled: true });

      await expect(generateSecret({ userId: "user-1" })).rejects.toThrow(TotpServiceError);
      await expect(generateSecret({ userId: "user-1" })).rejects.toMatchObject({
        code: "ALREADY_ENABLED",
      });
    });

    it("throws ENCRYPTION_KEY_MISSING without encryption key", async () => {
      const originalKey = envModule.env.TOTP_ENCRYPTION_KEY;
      envModule.env.TOTP_ENCRYPTION_KEY = undefined;
      userFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
      tfaFindUnique.mockResolvedValue(null);

      await expect(generateSecret({ userId: "user-1" })).rejects.toThrow(TotpServiceError);
      await expect(generateSecret({ userId: "user-1" })).rejects.toMatchObject({
        code: "ENCRYPTION_KEY_MISSING",
      });
      envModule.env.TOTP_ENCRYPTION_KEY = originalKey;
    });
  });

  describe("verifyAndEnable", () => {
    it("throws SETUP_NOT_FOUND if no 2FA setup exists", async () => {
      tfaFindUnique.mockResolvedValue(null);

      await expect(verifyAndEnable({ userId: "user-1", totpCode: "123456" })).rejects.toMatchObject(
        { code: "SETUP_NOT_FOUND" },
      );
    });

    it("throws ALREADY_ENABLED if 2FA is already enabled", async () => {
      tfaFindUnique.mockResolvedValue({ userId: "user-1", isEnabled: true });

      await expect(verifyAndEnable({ userId: "user-1", totpCode: "123456" })).rejects.toMatchObject(
        { code: "ALREADY_ENABLED" },
      );
    });
  });

  describe("verifyCode", () => {
    it("throws NOT_ENABLED if 2FA is not enabled", async () => {
      tfaFindUnique.mockResolvedValue(null);

      await expect(verifyCode({ userId: "user-1", code: "123456" })).rejects.toMatchObject({
        code: "NOT_ENABLED",
      });
    });

    it("throws NOT_ENABLED if 2FA is disabled", async () => {
      tfaFindUnique.mockResolvedValue({ userId: "user-1", isEnabled: false });

      await expect(verifyCode({ userId: "user-1", code: "123456" })).rejects.toMatchObject({
        code: "NOT_ENABLED",
      });
    });
  });

  describe("disableTwoFactor", () => {
    it("throws NOT_ENABLED if 2FA is not enabled", async () => {
      tfaFindUnique.mockResolvedValue(null);

      await expect(disableTwoFactor({ userId: "user-1" })).rejects.toMatchObject({
        code: "NOT_ENABLED",
      });
    });

    it("disables 2FA and emits event", async () => {
      tfaFindUnique.mockResolvedValue({ userId: "user-1", isEnabled: true });
      tfaDelete.mockResolvedValue({ userId: "user-1" });

      await disableTwoFactor({ userId: "user-1" });

      expect(tfaDelete).toHaveBeenCalledWith({ where: { userId: "user-1" } });
      expect(eventBus.emit).toHaveBeenCalledWith(
        "twoFactor.disabled",
        expect.objectContaining({
          entity: "twoFactorAuth",
          entityId: "user-1",
          actor: "user-1",
        }),
      );
    });
  });

  describe("regenerateBackupCodes", () => {
    it("throws NOT_ENABLED if 2FA is not enabled", async () => {
      tfaFindUnique.mockResolvedValue(null);

      await expect(regenerateBackupCodes({ userId: "user-1" })).rejects.toMatchObject({
        code: "NOT_ENABLED",
      });
    });

    it("generates new backup codes and emits event", async () => {
      tfaFindUnique.mockResolvedValue({ userId: "user-1", isEnabled: true });
      tfaUpdate.mockResolvedValue({ userId: "user-1" });

      const result = await regenerateBackupCodes({ userId: "user-1" });

      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(tfaUpdate).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalledWith(
        "twoFactor.backupCodesRegenerated",
        expect.objectContaining({
          entity: "twoFactorAuth",
          entityId: "user-1",
        }),
      );
    });
  });

  describe("getTwoFactorStatus", () => {
    it("returns disabled status when no 2FA record exists", async () => {
      tfaFindUnique.mockResolvedValue(null);

      const result = await getTwoFactorStatus({ userId: "user-1" });

      expect(result.isEnabled).toBe(false);
      expect(result.verifiedAt).toBeNull();
      expect(result.backupCodesRemaining).toBe(0);
    });

    it("returns enabled status with backup code count", async () => {
      tfaFindUnique.mockResolvedValue({
        isEnabled: true,
        verifiedAt: new Date("2026-01-01"),
        backupCodes: ["hash1", "hash2", "hash3"],
      });

      const result = await getTwoFactorStatus({ userId: "user-1" });

      expect(result.isEnabled).toBe(true);
      expect(result.verifiedAt).toEqual(new Date("2026-01-01"));
      expect(result.backupCodesRemaining).toBe(3);
    });
  });
});
