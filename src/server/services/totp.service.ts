import { z } from "zod";
import * as OTPAuth from "otpauth";
import * as QRCode from "qrcode";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import bcryptjs from "bcryptjs";
import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";

const TOTP_ISSUER = "Ignite";
const BACKUP_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 10;
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key) {
    throw new TotpServiceError(
      "TOTP_ENCRYPTION_KEY environment variable is not set",
      "ENCRYPTION_KEY_MISSING",
    );
  }
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new TotpServiceError(
      "TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
      "ENCRYPTION_KEY_INVALID",
    );
  }
  return keyBuffer;
}

function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptSecret(ciphertext: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcryptjs.hash(code.replace("-", ""), BCRYPT_ROUNDS)));
}

async function verifyBackupCode(
  plainCode: string,
  hashedCodes: string[],
): Promise<{ match: boolean; index: number }> {
  const normalized = plainCode.replace("-", "").toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    const isMatch = await bcryptjs.compare(normalized, hashedCodes[i]!);
    if (isMatch) {
      return { match: true, index: i };
    }
  }
  return { match: false, index: -1 };
}

export const generateSecretInput = z.object({
  userId: z.string().min(1),
});

export const verifyAndEnableInput = z.object({
  userId: z.string().min(1),
  totpCode: z.string().length(6),
});

export const verifyCodeInput = z.object({
  userId: z.string().min(1),
  code: z.string().min(1),
});

export const disableTwoFactorInput = z.object({
  userId: z.string().min(1),
});

export const regenerateBackupCodesInput = z.object({
  userId: z.string().min(1),
});

export const getTwoFactorStatusInput = z.object({
  userId: z.string().min(1),
});

export async function generateSecret(input: z.infer<typeof generateSecretInput>) {
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

  const secretBase32 = totp.secret.base32;
  const encryptedSecret = encryptSecret(secretBase32);

  await prisma.twoFactorAuth.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      secret: encryptedSecret,
      isEnabled: false,
    },
    update: {
      secret: encryptedSecret,
      isEnabled: false,
      backupCodes: [],
      verifiedAt: null,
    },
  });

  const otpauthUri = totp.toString();
  const qrCodeDataUri = await QRCode.toDataURL(otpauthUri);

  logger.info({ userId: input.userId }, "2FA secret generated");

  return {
    qrCodeDataUri,
    secret: secretBase32,
    otpauthUri,
  };
}

export async function verifyAndEnable(input: z.infer<typeof verifyAndEnableInput>) {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFactorAuth) {
    throw new TotpServiceError("2FA setup not initiated", "SETUP_NOT_FOUND");
  }

  if (twoFactorAuth.isEnabled) {
    throw new TotpServiceError("2FA is already enabled", "ALREADY_ENABLED");
  }

  const secretBase32 = decryptSecret(twoFactorAuth.secret);
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: input.totpCode, window: 1 });
  if (delta === null) {
    throw new TotpServiceError("Invalid TOTP code", "INVALID_CODE");
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashBackupCodes(backupCodes);

  await prisma.twoFactorAuth.update({
    where: { userId: input.userId },
    data: {
      isEnabled: true,
      verifiedAt: new Date(),
      backupCodes: hashedCodes,
    },
  });

  logger.info({ userId: input.userId }, "2FA enabled");

  eventBus.emit("twoFactor.enabled", {
    entity: "twoFactorAuth",
    entityId: input.userId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
  });

  return { backupCodes };
}

export async function verifyCode(input: z.infer<typeof verifyCodeInput>) {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
    throw new TotpServiceError("2FA is not enabled", "NOT_ENABLED");
  }

  const code = input.code.replace("-", "").trim();

  if (/^\d{6}$/.test(code)) {
    const secretBase32 = decryptSecret(twoFactorAuth.secret);
    const totp = new OTPAuth.TOTP({
      issuer: TOTP_ISSUER,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      return { verified: true, method: "totp" as const };
    }
  }

  const { match, index } = await verifyBackupCode(input.code, twoFactorAuth.backupCodes);
  if (match) {
    const updatedCodes = [...twoFactorAuth.backupCodes];
    updatedCodes.splice(index, 1);
    await prisma.twoFactorAuth.update({
      where: { userId: input.userId },
      data: { backupCodes: updatedCodes },
    });

    logger.info({ userId: input.userId }, "Backup code used for 2FA verification");

    return { verified: true, method: "backup" as const };
  }

  return { verified: false, method: null };
}

export async function disableTwoFactor(input: z.infer<typeof disableTwoFactorInput>) {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
    throw new TotpServiceError("2FA is not enabled", "NOT_ENABLED");
  }

  await prisma.twoFactorAuth.delete({
    where: { userId: input.userId },
  });

  logger.info({ userId: input.userId }, "2FA disabled");

  eventBus.emit("twoFactor.disabled", {
    entity: "twoFactorAuth",
    entityId: input.userId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
  });
}

export async function regenerateBackupCodes(input: z.infer<typeof regenerateBackupCodesInput>) {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
  });

  if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
    throw new TotpServiceError("2FA is not enabled", "NOT_ENABLED");
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = await hashBackupCodes(backupCodes);

  await prisma.twoFactorAuth.update({
    where: { userId: input.userId },
    data: { backupCodes: hashedCodes },
  });

  logger.info({ userId: input.userId }, "2FA backup codes regenerated");

  eventBus.emit("twoFactor.backupCodesRegenerated", {
    entity: "twoFactorAuth",
    entityId: input.userId,
    actor: input.userId,
    timestamp: new Date().toISOString(),
  });

  return { backupCodes };
}

export async function getTwoFactorStatus(input: z.infer<typeof getTwoFactorStatusInput>) {
  const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
    where: { userId: input.userId },
    select: {
      isEnabled: true,
      verifiedAt: true,
      backupCodes: true,
    },
  });

  return {
    isEnabled: twoFactorAuth?.isEnabled ?? false,
    verifiedAt: twoFactorAuth?.verifiedAt ?? null,
    backupCodesRemaining: twoFactorAuth?.backupCodes.length ?? 0,
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
