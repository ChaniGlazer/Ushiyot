import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/passwords";
import { attachSessionCookie, createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown; password?: unknown } | null;

  const name = typeof body?.name === "string" ? body.name.trim() : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!name || !password) {
    return NextResponse.json({ error: "יש להזין שם וסיסמה" }, { status: 400 });
  }

  // Accounts created before the name+phone signup flow only have an email on file -
  // let them keep logging in with it until they're migrated to have a name.
  const creator = db.prepare("SELECT id, password_hash FROM creators WHERE name = ? OR email = ?").get(
    name,
    name,
  ) as { id: number; password_hash: string } | undefined;

  if (!creator || !verifyPassword(password, creator.password_hash)) {
    return NextResponse.json({ error: "שם או סיסמה שגויים" }, { status: 401 });
  }

  const session = createSession(creator.id);
  const response = NextResponse.json({ ok: true });
  attachSessionCookie(response, session);

  return response;
}
