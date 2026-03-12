import { TRPCError } from "@trpc/server";
import { cacheGet, cacheSet } from "./redis";

interface RateLimitConfig {
  windowSeconds: number;
  maxAttempts: number;
}

/**
 * Check and increment a rate limit counter for a given key.
 * Throws a TRPCError with TOO_MANY_REQUESTS if the limit is exceeded.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<void> {
  const cacheKey = `rate_limit:${key}`;
  const current = await cacheGet(cacheKey);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= config.maxAttempts) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please try again later.",
    });
  }

  await cacheSet(cacheKey, String(count + 1), config.windowSeconds);
}
