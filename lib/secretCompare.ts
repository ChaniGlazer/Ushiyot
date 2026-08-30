import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time string comparison for secrets (ADMIN_SECRET, CRON_SECRET) - a plain `===`
 * short-circuits on the first differing character, which is a (low-severity but real) timing
 * side-channel; this matches the timing-safety lib/passwords.ts already uses for password
 * verification. Both sides are hashed to a fixed-length digest first so timingSafeEqual never
 * sees mismatched buffer lengths (which would otherwise throw, or - if guarded by a length check
 * first - leak the length itself via timing).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}
