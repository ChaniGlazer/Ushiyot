import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCreatorProfile } from "@/lib/creators";
import { getDailyInfo, getFallbackDailyInfo } from "@/lib/hebcal";
import { generateIdeas } from "@/lib/generateIdeas";
import { formatDailyIdeasMessage, sendWhatsappMessage } from "@/lib/sendWhatsapp";
import { CREATOR_ROW_COLUMNS, type CreatorRow } from "@/lib/session";
import { constantTimeEqual } from "@/lib/secretCompare";

type ActiveCreatorRow = CreatorRow & { whatsapp_number: string };

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return (!!querySecret && constantTimeEqual(querySecret, secret)) || (!!headerSecret && constantTimeEqual(headerSecret, secret));
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  // Column list comes from CREATOR_ROW_COLUMNS (lib/session.ts) - the same source of truth
  // getCreatorById/getCreatorBySession use - instead of a hand-typed copy that can silently
  // drift from CreatorRow. No shabbat_mode_enabled column: Shabbat mode is deliberately NOT a
  // per-creator setting (see app/api/settings/route.ts's comment); the site blocks everyone
  // unconditionally via middleware.ts instead.
  let creators: ActiveCreatorRow[];
  try {
    creators = db
      .prepare(
        `SELECT ${CREATOR_ROW_COLUMNS}
         FROM creators
         WHERE whatsapp_number IS NOT NULL AND whatsapp_number != '' AND whatsapp_notifications_enabled = 1`,
      )
      .all() as ActiveCreatorRow[];
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בשליפת יוצרות פעילות" },
      { status: 500 },
    );
  }

  // If Hebcal is down, still generate and send ideas to every creator today - just without the
  // Hebrew date/events/Shabbat decoration - rather than a single Hebcal failure silently
  // skipping the daily message for every creator (the per-creator try/catch below only isolates
  // generateIdeas/sendWhatsappMessage failures, not this one shared call above the loop).
  let dailyInfo;
  try {
    dailyInfo = await getDailyInfo();
  } catch (error) {
    console.error("[cron/send-daily-ideas] getDailyInfo() failed - falling back to minimal daily info", error);
    dailyInfo = getFallbackDailyInfo();
  }
  const hebrewDateText = dailyInfo.hebrewDate.formatted || dailyInfo.gregorianDate;

  const results: { creatorId: number; status: "sent" | "skipped"; reason?: string }[] = [];

  for (const creatorRow of creators) {
    try {
      const profile = toCreatorProfile(creatorRow);
      const ideas = await generateIdeas(profile, dailyInfo);
      const message = formatDailyIdeasMessage(hebrewDateText, ideas);
      await sendWhatsappMessage(creatorRow.whatsapp_number, message);
      results.push({ creatorId: creatorRow.id, status: "sent" });
    } catch (error) {
      results.push({
        creatorId: creatorRow.id,
        status: "skipped",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    date: dailyInfo.gregorianDate,
    totalCreators: creators.length,
    sent: results.filter((r) => r.status === "sent").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    results,
  });
}
