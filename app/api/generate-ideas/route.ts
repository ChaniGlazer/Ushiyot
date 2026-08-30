import { NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { toCreatorProfile } from "@/lib/creators";
import { appendPersistentContext } from "@/lib/persistentContext";
import { getDailyInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT, generateIdeas } from "@/lib/generateIdeas";
import { DAILY_LIMIT_MESSAGE, GLOBAL_DAILY_LIMIT_MESSAGE } from "@/lib/apiUsage";

const MAX_COUNT = 10;
const MAX_HINT_LENGTH = 200;

export async function GET(request: Request) {
  // The creator this call acts on is always the logged-in session's own account - never a
  // client-supplied id - so there's no way to trigger generation (or persistent-context writes
  // via remember=true below) against someone else's profile.
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

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

  // Save the remembered fact regardless of whether generation itself succeeds below -
  // the user's intent to save it shouldn't depend on this particular OpenAI call working.
  if (remember && hint) {
    appendPersistentContext(creator.id, hint);
  }

  try {
    const dailyInfo = await getDailyInfo();
    const profile = toCreatorProfile(creator);
    const ideas = await generateIdeas(profile, dailyInfo, count, hint);

    return NextResponse.json({
      creatorId: creator.id,
      date: dailyInfo.gregorianDate,
      count: ideas.length,
      ideas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "שגיאה ביצירת רעיונות תוכן";
    const status = message === DAILY_LIMIT_MESSAGE || message === GLOBAL_DAILY_LIMIT_MESSAGE ? 429 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
