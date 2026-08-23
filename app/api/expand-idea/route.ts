import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCreatorProfile } from "@/lib/creators";
import { expandIdea } from "@/lib/expandIdea";
import { DAILY_LIMIT_MESSAGE } from "@/lib/apiUsage";
import type { CreatorRow } from "@/lib/session";

type ExpandIdeaPayload = {
  creatorId?: unknown;
  title?: unknown;
  description?: unknown;
  type?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ExpandIdeaPayload | null;

  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין" }, { status: 400 });
  }

  const creatorId = Number(body.creatorId);
  if (!Number.isInteger(creatorId) || creatorId <= 0) {
    return NextResponse.json({ error: "creatorId לא תקין" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim() : "";

  if (!title || !description || !type) {
    return NextResponse.json({ error: "חסרים פרטי רעיון (כותרת/תיאור/סוג)" }, { status: 400 });
  }

  const creatorRow = db
    .prepare(
      `SELECT id, email, name, gender, sector, niche, tone_style, uses_emojis, children_count, city, family_status, platforms, whatsapp_number, persistent_context, created_at
       FROM creators WHERE id = ?`,
    )
    .get(creatorId) as CreatorRow | undefined;

  if (!creatorRow) {
    return NextResponse.json({ error: "יוצר לא נמצא" }, { status: 404 });
  }

  try {
    const profile = toCreatorProfile(creatorRow);
    const draftText = await expandIdea(profile, { title, description, type });

    return NextResponse.json({ draft_text: draftText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בהרחבת הרעיון";
    const status = message === DAILY_LIMIT_MESSAGE ? 429 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
