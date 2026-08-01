import { NextResponse } from "next/server";

/**
 * A small in-process rate limiter for abuse-prone endpoints (registration,
 * password reset, chat). It is per-instance and resets on restart — enough to
 * blunt scripted abuse in a single-node deployment, and the obvious place to
 * swap in a shared store if this ever runs on more than one node.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
/** Drop expired buckets occasionally so the map cannot grow without bound. */
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

/**
 * Returns a 429 response when the caller is over budget, or null to continue.
 *
 *   const limited = rateLimit(request, "register", { max: 5, windowMs: 3600_000 });
 *   if (limited) return limited;
 */
export function rateLimit(
  request: Request,
  scope: string,
  { max, windowMs }: RateLimitOptions
): NextResponse | null {
  const now = Date.now();
  sweep(now);

  const key = `${scope}:${clientKey(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= max) return null;

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  return NextResponse.json(
    { error: "rate_limited", retryAfter },
    { status: 429, headers: { "retry-after": String(retryAfter) } }
  );
}

/** Test helper: forget every bucket. */
export function resetRateLimits(): void {
  buckets.clear();
}
