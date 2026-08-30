import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { toCreatorProfile } from "@/lib/creators";
import { expandIdea } from "@/lib/expandIdea";
import { DAILY_LIMIT_MESSAGE, GLOBAL_DAILY_LIMIT_MESSAGE } from "@/lib/apiUsage";
import { incrementExpansionsCount } from "@/lib/accuracyScore";

type ExpandIdeaPayload = {
  title?: unknown;
  description?: unknown;
  type?: unknown;
};

export async function POST(request: Request) {
  // The creator this call acts on is always the logged-in session's own account - never a
  // client-supplied id - so there's no way to spend someone else's OpenAI budget or read back
  // content drafted from their profile.
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ExpandIdeaPayload | null;

  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim() : "";

  if (!title || !description || !type) {
    return NextResponse.json({ error: "חסרים פרטי רעיון (כותרת/תיאור/סוג)" }, { status: 400 });
  }

  try {
    const profile = toCreatorProfile(creator);
    const draftText = await expandIdea(profile, { title, description, type });
    incrementExpansionsCount(creator.id);

    return NextResponse.json({ draft_text: draftText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה בהרחבת הרעיון";
    const status = message === DAILY_LIMIT_MESSAGE || message === GLOBAL_DAILY_LIMIT_MESSAGE ? 429 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
