import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  EMAIL_FROM: z.string().default("noreply@innoflow.app"),
  APP_URL: z.string().default("http://localhost:3000"),
  APP_NAME: z.string().default("InnoFlow"),
  DIGEST_DAILY_HOUR: z.coerce.number().min(0).max(23).default(8),
  DIGEST_WEEKLY_DAY: z.coerce.number().min(0).max(6).default(1), // Monday
  DIGEST_WEEKLY_HOUR: z.coerce.number().min(0).max(23).default(8),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}
