import { randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import { db } from "./db";

export const SESSION_COOKIE_NAME = "nitzotz_session";
// Long-lived on purpose: this is a personal-use tool, not a shared/public login -
// once someone logs in on their own device, they shouldn't need to type name+password again.
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export type CreatorRow = {
  id: number;
  email: string;
  name: string | null;
  gender: string | null;
  vocabulary_style: string | null;
  niche: string | null;
  tone_style: string | null;
  uses_emojis: number | null;
  children_count: number | null;
  city: string | null;
  family_status: string | null;
  platforms: string | null;
  whatsapp_number: string | null;
  persistent_context: string | null;
  created_at: string;
};

export function createSession(creatorId: number): { id: string; expiresAt: Date } {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  db.prepare("INSERT INTO sessions (id, creator_id, expires_at) VALUES (?, ?, ?)").run(
    id,
    creatorId,
    expiresAt.toISOString(),
  );

  return { id, expiresAt };
}

export function deleteSession(sessionId: string): void {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

export function getCreatorBySession(sessionId: string | undefined): CreatorRow | null {
  if (!sessionId) return null;

  const session = db.prepare("SELECT creator_id, expires_at FROM sessions WHERE id = ?").get(sessionId) as
    | { creator_id: number; expires_at: string }
    | undefined;

  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  const creator = db
    .prepare(
      `SELECT id, email, name, gender, vocabulary_style, niche, tone_style, uses_emojis, children_count, city, family_status, platforms, whatsapp_number, persistent_context, created_at
       FROM creators WHERE id = ?`,
    )
    .get(session.creator_id) as CreatorRow | undefined;

  return creator ?? null;
}

export function attachSessionCookie(response: NextResponse, session: { id: string; expiresAt: Date }): void {
  response.cookies.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
}
