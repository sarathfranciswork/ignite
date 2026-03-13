import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import { hash, compare } from "bcryptjs";
import QRCode from "qrcode";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";

const BCRYPT_COST_FACTOR = 12;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;
const TOTP_ISSUER = "Ignite";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key) {
    throw new TotpServiceError(
      "TOTP_ENCRYPTION_KEY environment variable is not set",
      "ENCRYPTION_KEY_MISSING",
    );
  }
  return createHmac("sha256", key).digest();
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new TotpServiceError("Invalid encrypted secret format", "INVALID_SECRET_FORMAT");
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = Buffer.from(parts[2], "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

function generateBackupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(BACKUP_CODE_LENGTH);
  for (let i = 0; i < BACKUP_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export const setupTwoFactorInput = z.object({
  userId: z.string(),
});

export const generateSecretInput = setupTwoFactorInput;

export const verifyAndEnableInput = z.object({
  userId: z.string(),
  totpCode: z.string().length(6),
});

export const verifyCodeInput = z.object({
  userId: z.string(),
  code: z.string().min(1),
});

export const disableTwoFactorInput = z.object({
  userId: z.string(),
});

export const regenerateBackupCodesInput = z.object({
  userId: z.string(),
});

export async function generateSecret(input: z.infer<typeof setupTwoFactorInput>) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new TotpServiceError("User not found", "USER_NOT_FOUND");
  }

  const existing = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (existing?.isEnabled) {
    throw new TotpServiceError("2FA is already enabled", "ALREADY_ENABLED");
  }

  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;
  const encryptedSecret = encryptSecret(secret);
  const otpauthUri = totp.toString();

  await prisma.twoFactorAuth.upsert({
    where: { userId: input.userId },
    update: {
      secret: encryptedSecret,
      isEnabled: false,
      backupCodes: [],
      verifiedAt: null,
    },
    create: {
      userId: input.userId,
      secret: encryptedSecret,
      isEnabled: false,
      backupCodes: [],
    },
  });

  const qrCodeDataUri = await QRCode.toDataURL(otpauthUri);

  logger.info({ userId: input.userId }, "2FA setup initiated");

  return {
    qrCodeDataUri,
    secret,
    otpauthUri,
  };
}

export async function verifyAndEnable(input: z.infer<typeof verifyAndEnableInput>) {
  const twoFa = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFa) {
    throw new TotpServiceError("2FA not set up. Call setup first.", "NOT_SETUP");
  }

  if (twoFa.isEnabled) {
    throw new TotpServiceError("2FA is already enabled", "ALREADY_ENABLED");
  }

  const secret = decryptSecret(twoFa.secret);
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: input.totpCode, window: 1 });
  if (delta === null) {
    throw new TotpServiceError("Invalid TOTP code", "INVALID_CODE");
  }

  const rawBackupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    rawBackupCodes.push(code);
    hashedBackupCodes.push(await hash(code, BCRYPT_COST_FACTOR));
  }

  await prisma.twoFactorAuth.update({
    where: { userId: input.userId },
    data: {
      isEnabled: true,
      backupCodes: hashedBackupCodes,
      verifiedAt: new Date(),
    },
  });

  logger.info({ userId: input.userId }, "2FA enabled");

  eventBus.emit("twoFactor.enabled", {
    entity: "user",
    entityId: input.userId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
  });

  return { backupCodes: rawBackupCodes };
}

export async function verifyCode(input: z.infer<typeof verifyCodeInput>) {
  const twoFa = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFa?.isEnabled) {
    throw new TotpServiceError("2FA is not enabled", "NOT_ENABLED");
  }

  // Try TOTP code first (6 digits)
  if (/^\d{6}$/.test(input.code)) {
    const secret = decryptSecret(twoFa.secret);
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: input.code, window: 1 });
    if (delta !== null) {
      return { valid: true, method: "totp" as const };
    }
  }

  // Try backup codes
  const normalizedCode = input.code.toUpperCase().replace(/\s/g, "");
  for (let i = 0; i < twoFa.backupCodes.length; i++) {
    const isMatch = await compare(normalizedCode, twoFa.backupCodes[i]);
    if (isMatch) {
      // Remove used backup code
      const updatedCodes = [...twoFa.backupCodes];
      updatedCodes.splice(i, 1);
      await prisma.twoFactorAuth.update({
        where: { userId: input.userId },
        data: { backupCodes: updatedCodes },
      });

      logger.info({ userId: input.userId }, "Backup code used for 2FA verification");
      return { valid: true, method: "backup" as const };
    }
  }

  return { valid: false, method: null };
}

export async function disableTwoFactor(input: z.infer<typeof disableTwoFactorInput>) {
  const twoFa = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFa) {
    throw new TotpServiceError("2FA is not set up", "NOT_SETUP");
  }

  await prisma.twoFactorAuth.delete({
    where: { userId: input.userId },
  });

  logger.info({ userId: input.userId }, "2FA disabled");

  eventBus.emit("twoFactor.disabled", {
    entity: "user",
    entityId: input.userId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

export async function regenerateBackupCodes(input: z.infer<typeof regenerateBackupCodesInput>) {
  const twoFa = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFa?.isEnabled) {
    throw new TotpServiceError("2FA is not enabled", "NOT_ENABLED");
  }

  const rawBackupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    rawBackupCodes.push(code);
    hashedBackupCodes.push(await hash(code, BCRYPT_COST_FACTOR));
  }

  await prisma.twoFactorAuth.update({
    where: { userId: input.userId },
    data: { backupCodes: hashedBackupCodes },
  });

  logger.info({ userId: input.userId }, "2FA backup codes regenerated");

  return { backupCodes: rawBackupCodes };
}

export async function getTwoFactorStatus(userId: string) {
  const twoFa = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: { isEnabled: true, verifiedAt: true },
  });

  return {
    isEnabled: twoFa?.isEnabled ?? false,
    verifiedAt: twoFa?.verifiedAt ?? null,
  };
}

export class TotpServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "TotpServiceError";
    this.code = code;
  }
}
