import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { attachSessionCookie, createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { whatsappNumber?: unknown; password?: unknown } | null;

  const whatsappNumber = typeof body?.whatsappNumber === "string" ? body.whatsappNumber.trim() : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!whatsappNumber || !password) {
    return NextResponse.json({ error: "יש להזין מספר וואטסאפ וסיסמה" }, { status: 400 });
  }

  // The phone number, not the name, is the account's real unique identifier (see
  // idx_creators_whatsapp_number in lib/migrations.ts) - names are allowed to repeat across
  // different accounts, so logging in by name would be ambiguous.
  const creator = db.prepare("SELECT id, password_hash FROM creators WHERE whatsapp_number = ?").get(
    whatsappNumber,
  ) as { id: number; password_hash: string } | undefined;

  if (!creator || !verifyPassword(password, creator.password_hash)) {
    return NextResponse.json({ error: "מספר וואטסאפ או סיסמה שגויים" }, { status: 401 });
  }

  const session = createSession(creator.id);
  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, session);

  return response;
}
