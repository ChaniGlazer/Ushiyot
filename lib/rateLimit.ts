// Simple in-memory rate limiter - a plain Map in this Node process, not backed by the DB or an
// external service. Appropriate for this app's deployment (a single long-running Node process on
// Render, not multiple instances - see lib/db.ts's SQLite Proxy comment, which relies on the same
// assumption). Resets on every deploy/restart - an accepted tradeoff for a personal-scale tool,
// not a bug: an abuse counter starting fresh after a restart is low-risk here, and this avoids a
// DB migration/new table just for rate limiting.
type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

/**
 * Records one call under `key` and returns whether it should be BLOCKED - i.e. `key` has
 * already made `limit` or more calls within the trailing `windowMs`. A blocked call still isn't
 * counted again (no point double-penalizing), so once a caller is blocked it stays blocked for
 * the rest of the window rather than the window quietly resetting from continued attempts.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  if (bucket.count >= limit) {
    return true;
  }

  bucket.count += 1;
  return false;
}

/** Render (and most PaaS proxies) set x-forwarded-for to the real client IP; falls back to a
 * constant so callers still get a (shared, less precise) rate-limit bucket locally/direct rather
 * than throwing when the header is absent. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
