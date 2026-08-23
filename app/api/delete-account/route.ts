import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  db.prepare("DELETE FROM creators WHERE id = ?").run(creator.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}
