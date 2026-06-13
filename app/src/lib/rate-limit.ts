// =====================================================
// Simple in-memory rate limiter for API routes.
// =====================================================
// For low-traffic private app this is sufficient. If we
// ever scale horizontally, swap to Upstash Redis using
// the same key/check shape.
// =====================================================

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    const fresh: Bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: opts.limit - 1, resetAt: fresh.resetAt };
  }
  if (b.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count++;
  return { ok: true, remaining: opts.limit - b.count, resetAt: b.resetAt };
}

// Best-effort: pick a stable key from request headers.
export function ipFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
