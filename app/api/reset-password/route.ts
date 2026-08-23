import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { attachSessionCookie, createSession } from "@/lib/session";

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

  // Matching the exact name AND phone number a real account registered with is the
  // identity check here - reasonable for a small, personal-use tool with no email/SMS
  // infrastructure to send a verification code through.
  const creator = db
    .prepare("SELECT id FROM creators WHERE name = ? AND whatsapp_number = ?")
    .get(name, whatsappNumber) as { id: number } | undefined;

  if (!creator) {
    return NextResponse.json({ error: "לא נמצא חשבון עם השם ומספר הוואטסאפ האלה" }, { status: 404 });
  }

  db.prepare("UPDATE creators SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), creator.id);

  const session = createSession(creator.id);
  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, session);

  return response;
}
