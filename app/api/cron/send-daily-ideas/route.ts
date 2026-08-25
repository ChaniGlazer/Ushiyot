import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toCreatorProfile } from "@/lib/creators";
import { getDailyInfo } from "@/lib/hebcal";
import { generateIdeas } from "@/lib/generateIdeas";
import { formatDailyIdeasMessage, sendWhatsappMessage } from "@/lib/sendWhatsapp";
import type { CreatorRow } from "@/lib/session";

type ActiveCreatorRow = CreatorRow & { whatsapp_number: string };

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const headerSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return querySecret === secret || headerSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  const creators = db
    .prepare(
      `SELECT id, email, name, gender, vocabulary_style, niche, tone_style, uses_emojis, children_count, city, family_status, platforms, whatsapp_number, persistent_context, created_at
       FROM creators WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''`,
    )
    .all() as ActiveCreatorRow[];

  const dailyInfo = await getDailyInfo();

  const results: { creatorId: number; status: "sent" | "skipped"; reason?: string }[] = [];

  for (const creatorRow of creators) {
    try {
      const profile = toCreatorProfile(creatorRow);
      const ideas = await generateIdeas(profile, dailyInfo);
      const message = formatDailyIdeasMessage(dailyInfo.hebrewDate.formatted, ideas);
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
