/**
 * Rate limiting via Upstash Redis REST (multi-instance Vercel).
 * Repli in-memory si variables absentes.
 */

import { rateLimit as rateLimitMemory, type RateLimitOptions } from "@/lib/rate-limit";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

function windowBucketKey(key: string, windowSec: number): string {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  return `rl:${key}:${bucket}`;
}

async function upstashPipeline(
  commands: (string | number)[][]
): Promise<unknown[]> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return [];

  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(commands),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: unknown }[];
  return json.map((row) => row.result);
}

export function isDistributedRateLimitEnabled(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function rateLimitDistributed(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (!isDistributedRateLimitEnabled()) {
    return rateLimitMemory(key, options);
  }

  const windowKey = windowBucketKey(key, options.windowSec);
  const windowMs = options.windowSec * 1000;
  const now = Date.now();
  const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;

  try {
    const results = await upstashPipeline([
      ["INCR", windowKey],
      ["EXPIRE", windowKey, options.windowSec],
    ]);
    const count = typeof results[0] === "number" ? results[0] : Number(results[0]) || 1;
    const remaining = Math.max(0, options.limit - count);
    const success = count <= options.limit;

    return {
      success,
      remaining,
      resetAt,
      headers: {
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        ...(success ? {} : { "Retry-After": String(Math.ceil((resetAt - now) / 1000)) }),
      },
    };
  } catch {
    return rateLimitMemory(key, options);
  }
}
