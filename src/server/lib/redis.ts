import { logger } from "./logger";

const REDIS_URL_CONFIGURED = !!process.env.REDIS_URL;

const childLogger = logger.child({ service: "redis" });

// TODO: Implement actual Redis client connection when needed.
// Until a real Redis client is integrated, all cache operations
// use the in-memory fallback regardless of REDIS_URL being set.
const redisConnected = false;

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

function cleanExpired(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}

const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanExpired, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (redisConnected) {
    // TODO: Redis client GET when connected
    return null;
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (redisConnected) {
    // TODO: Redis client SET when connected
    return;
  }

  ensureCleanup();
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(key: string): Promise<void> {
  if (redisConnected) {
    // TODO: Redis client DEL when connected
    return;
  }

  memoryCache.delete(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (redisConnected) {
    // TODO: Redis client SCAN + DEL when connected
    return;
  }

  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
}

export function clearMemoryCache(): void {
  memoryCache.clear();
}

export function isRedisAvailable(): boolean {
  return REDIS_URL_CONFIGURED;
}

childLogger.info({ redisUrlConfigured: REDIS_URL_CONFIGURED, redisConnected }, "Cache initialized");
