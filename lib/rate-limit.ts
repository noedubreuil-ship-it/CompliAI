/**
 * Simple in-memory rate limiter.
 * In production, replace with Redis (e.g. Upstash) for multi-instance support.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSec * 1000;

  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, options.limit - entry.count);
  const success = entry.count <= options.limit;

  return {
    success,
    remaining,
    resetAt: entry.resetAt,
    headers: {
      "X-RateLimit-Limit": String(options.limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
      ...(success ? {} : { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) }),
    },
  };
}

/** Rate limit an API route by user ID. Returns 429 response or null. */
export async function rateLimitUser(
  userId: string,
  route: string,
  options: RateLimitOptions
): Promise<Response | null> {
  const key = `${route}:${userId}`;
  const result = rateLimit(key, options);

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans quelques minutes." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...result.headers,
        },
      }
    );
  }
  return null;
}

/** Predefined limits for common routes */
export const RATE_LIMITS = {
  chat: { limit: 20, windowSec: 60 },          // 20 messages/min
  audit: { limit: 5, windowSec: 60 },           // 5 audits/min
  generate: { limit: 10, windowSec: 60 },        // 10 generations/min
  pdf: { limit: 20, windowSec: 60 },             // 20 PDF downloads/min
  search: { limit: 30, windowSec: 60 },          // 30 searches/min
};
