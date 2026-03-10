import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  CRUNCHBASE_API_KEY: z.string().optional(),
  CRUNCHBASE_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.crunchbase.com/api/v4"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(process.env);
  return cachedEnv;
}

export function getCrunchbaseApiKey(): string {
  const env = getEnv();
  if (!env.CRUNCHBASE_API_KEY) {
    throw new Error(
      "CRUNCHBASE_API_KEY is not configured. Set it in Admin > Integrations.",
    );
  }
  return env.CRUNCHBASE_API_KEY;
}
