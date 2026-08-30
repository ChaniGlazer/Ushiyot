import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/creators";
import { hashPassword } from "@/lib/passwords";
import { attachSessionCookie, createSession } from "@/lib/session";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Tighter and longer-windowed than login: this endpoint's identity check (name+phone, no OTP -
// see the audit note below) is weaker than a password, so scripted guessing needs to be made
// impractical here specifically, not just slowed down.
const RESET_RATE_LIMIT = 5;
const RESET_RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; whatsappNumber?: unknown; newPassword?: unknown }
    | null;

  const name = typeof body?.name === "string" ? body.name.trim() : null;
  const whatsappNumber = typeof body?.whatsappNumber === "string" ? body.whatsappNumber.trim() : null;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : null;

  if (!name || !whatsappNumber) {
    return NextResponse.json({ error: "יש להזין שם ומספר וואטסאפ" }, { status: 400 });
  }
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "הסיסמה החדשה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
  }

  // Limited by IP AND by the target phone number, same reasoning as /api/login. This is a
  // mitigation, not a full fix - see the Critical audit finding on this route: without a real
  // WhatsApp OTP (no WhatsApp Business API is connected yet - see lib/sendWhatsapp.ts), someone
  // who already knows a specific creator's exact name+phone can still reset their password; this
  // closes off scripted/brute-force guessing, not a targeted attempt against a known identity.
  const ip = getClientIp(request);
  const normalizedPhone = normalizePhone(whatsappNumber);
  const ipLimited = isRateLimited(`reset-password:ip:${ip}`, RESET_RATE_LIMIT, RESET_RATE_WINDOW_MS);
  const phoneLimited = isRateLimited(`reset-password:phone:${normalizedPhone}`, RESET_RATE_LIMIT, RESET_RATE_WINDOW_MS);
  if (ipLimited || phoneLimited) {
    return NextResponse.json({ error: "יותר מדי ניסיונות - נסו שוב בעוד שעה" }, { status: 429 });
  }

  // Matching the exact name AND phone number a real account registered with is the
  // identity check here - reasonable for a small, personal-use tool with no email/SMS
  // infrastructure to send a verification code through. Phone compared digits-only, same as
  // login (see app/api/login), so it doesn't matter whether either side has the optional dash.
  const creator = db
    .prepare("SELECT id FROM creators WHERE name = ? AND REPLACE(whatsapp_number, '-', '') = ?")
    .get(name, normalizedPhone) as { id: number } | undefined;

  if (!creator) {
    return NextResponse.json({ error: "לא נמצא חשבון עם השם ומספר הוואטסאפ האלה" }, { status: 404 });
  }

  db.prepare("UPDATE creators SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), creator.id);

  const session = createSession(creator.id);
  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, session);

  return response;
}
