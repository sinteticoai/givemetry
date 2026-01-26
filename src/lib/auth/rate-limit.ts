// T261: Rate limiting for auth endpoints
import { LRUCache } from "lru-cache";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limiter using LRU cache
// For production at scale, consider using Redis
const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 10000, // Max 10k unique keys
  ttl: 15 * 60 * 1000, // 15 minutes TTL
});

// Default rate limits for different endpoint types
export const RATE_LIMITS = {
  // Strict limits for auth endpoints (prevent brute force)
  login: { interval: 15 * 60 * 1000, limit: 5 }, // 5 attempts per 15 min
  signup: { interval: 60 * 60 * 1000, limit: 3 }, // 3 signups per hour per IP
  passwordReset: { interval: 60 * 60 * 1000, limit: 3 }, // 3 reset requests per hour
  verifyEmail: { interval: 5 * 60 * 1000, limit: 10 }, // 10 verifications per 5 min

  // Moderate limits for AI endpoints (cost protection)
  generateBrief: { interval: 60 * 1000, limit: 10 }, // 10 briefs per minute
  nlQuery: { interval: 60 * 1000, limit: 20 }, // 20 queries per minute

  // Standard API limits
  api: { interval: 60 * 1000, limit: 100 }, // 100 requests per minute
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier (typically IP + endpoint or user ID + endpoint)
 * @param type - Type of rate limit to apply
 * @returns Object with allowed status and retry information
 */
export function checkRateLimit(
  key: string,
  type: RateLimitType
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number | null;
} {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const cacheKey = `${type}:${key}`;

  let entry = rateLimitCache.get(cacheKey);

  // If no entry or window has passed, create new entry
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 1,
      resetAt: now + config.interval,
    };
    rateLimitCache.set(cacheKey, entry);
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
      retryAfter: null,
    };
  }

  // Increment count
  entry.count++;
  rateLimitCache.set(cacheKey, entry);

  const allowed = entry.count <= config.limit;
  const remaining = Math.max(0, config.limit - entry.count);
  const retryAfter = allowed ? null : Math.ceil((entry.resetAt - now) / 1000);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
  };
}

/**
 * Reset rate limit for a key (useful after successful action)
 */
export function resetRateLimit(key: string, type: RateLimitType): void {
  const cacheKey = `${type}:${key}`;
  rateLimitCache.delete(cacheKey);
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(
  key: string,
  type: RateLimitType
): Record<string, string> {
  const result = checkRateLimit(key, type);
  // Decrement count since checkRateLimit increments it
  const entry = rateLimitCache.get(`${type}:${key}`);
  if (entry && entry.count > 0) {
    entry.count--;
    rateLimitCache.set(`${type}:${key}`, entry);
  }

  return {
    "X-RateLimit-Limit": String(RATE_LIMITS[type].limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
  };
}

/**
 * Create a rate limit key from IP and optional user identifier
 */
export function createRateLimitKey(
  ip: string | null,
  userId?: string
): string {
  const sanitizedIp = ip || "unknown";
  return userId ? `${userId}:${sanitizedIp}` : sanitizedIp;
}
