import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCreatorProfile } from "@/lib/creators";
import { appendPersistentContext } from "@/lib/persistentContext";
import { getDailyInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT, generateIdeas } from "@/lib/generateIdeas";
import { DAILY_LIMIT_MESSAGE } from "@/lib/apiUsage";
import type { CreatorRow } from "@/lib/session";

const MAX_COUNT = 10;
const MAX_HINT_LENGTH = 200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const creatorIdParam = searchParams.get("creatorId");
  const creatorId = creatorIdParam ? Number(creatorIdParam) : NaN;

  if (!creatorIdParam || !Number.isInteger(creatorId) || creatorId <= 0) {
    return NextResponse.json({ error: "פרמטר creatorId חסר או לא תקין" }, { status: 400 });
  }

  let count = DEFAULT_IDEA_COUNT;
  const countParam = searchParams.get("count");
  if (countParam !== null) {
    const parsedCount = Number(countParam);
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > MAX_COUNT) {
      return NextResponse.json({ error: `count חייב להיות מספר שלם בין 1 ל-${MAX_COUNT}` }, { status: 400 });
    }
    count = parsedCount;
  }

  const hintParam = searchParams.get("hint");
  if (hintParam !== null && hintParam.length > MAX_HINT_LENGTH) {
    return NextResponse.json({ error: `הכיוון המבוקש ארוך מדי (מקסימום ${MAX_HINT_LENGTH} תווים)` }, { status: 400 });
  }
  const hint = hintParam?.trim() || null;
  const remember = searchParams.get("remember") === "true";

  const creatorRow = db
    .prepare(
      `SELECT id, email, name, gender, sector, niche, tone_style, uses_emojis, children_count, city, family_status, platforms, whatsapp_number, persistent_context, created_at
       FROM creators WHERE id = ?`,
    )
    .get(creatorId) as CreatorRow | undefined;

  if (!creatorRow) {
    return NextResponse.json({ error: "יוצר לא נמצא" }, { status: 404 });
  }

  // Save the remembered fact regardless of whether generation itself succeeds below -
  // the user's intent to save it shouldn't depend on this particular OpenAI call working.
  if (remember && hint) {
    appendPersistentContext(creatorId, hint);
  }

  try {
    const dailyInfo = await getDailyInfo();
    const profile = toCreatorProfile(creatorRow);
    const ideas = await generateIdeas(profile, dailyInfo, count, hint);

    return NextResponse.json({
      creatorId,
      date: dailyInfo.gregorianDate,
      count: ideas.length,
      ideas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה ביצירת רעיונות תוכן";
    const status = message === DAILY_LIMIT_MESSAGE ? 429 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
