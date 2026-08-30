import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/creators";
import { verifyPassword } from "@/lib/passwords";
import { attachSessionCookie, createSession } from "@/lib/session";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Generous enough for a real user who mistypes a password a few times, tight enough to make
// scripted brute-forcing a specific account (or scanning many phone numbers from one IP)
// impractical.
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { whatsappNumber?: unknown; password?: unknown } | null;

  const whatsappNumber = typeof body?.whatsappNumber === "string" ? body.whatsappNumber.trim() : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!whatsappNumber || !password) {
    return NextResponse.json({ error: "יש להזין מספר וואטסאפ וסיסמה" }, { status: 400 });
  }

  // Limited by IP (catches one machine scanning many accounts) AND by the target phone number
  // (catches many machines hammering one account) - either bucket tripping blocks the attempt.
  const ip = getClientIp(request);
  const normalizedPhone = normalizePhone(whatsappNumber);
  const ipLimited = isRateLimited(`login:ip:${ip}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS);
  const phoneLimited = isRateLimited(`login:phone:${normalizedPhone}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_MS);
  if (ipLimited || phoneLimited) {
    return NextResponse.json({ error: "יותר מדי ניסיונות התחברות - נסו שוב בעוד כמה דקות" }, { status: 429 });
  }

  // The phone number, not the name, is the account's real unique identifier (see
  // idx_creators_whatsapp_number in lib/migrations.ts) - names are allowed to repeat across
  // different accounts, so logging in by name would be ambiguous. Compared digits-only (both
  // the typed number and the stored column) so it doesn't matter whether either side has the
  // optional dash isValidIsraeliMobile allows (e.g. "050-1234567" vs "0501234567").
  const creator = db
    .prepare("SELECT id, password_hash FROM creators WHERE REPLACE(whatsapp_number, '-', '') = ?")
    .get(normalizedPhone) as { id: number; password_hash: string } | undefined;

  if (!creator || !verifyPassword(password, creator.password_hash)) {
    return NextResponse.json({ error: "מספר וואטסאפ או סיסמה שגויים" }, { status: 401 });
  }

  const session = createSession(creator.id);
  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, session);

  return response;
}
