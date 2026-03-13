import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 16;

function deriveKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  return crypto.scryptSync(secret, salt, 32);
}

export function encrypt(plaintext: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${salt.toString("hex")}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const [saltHex, ivHex, authTagHex, encrypted] = ciphertext.split(":");

  if (!saltHex || !ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted value format");
  }

  const salt = Buffer.from(saltHex, "hex");
  const key = deriveKey(salt);
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
