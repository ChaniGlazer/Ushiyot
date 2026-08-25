import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { GENDERS, isValidIsraeliMobile, type CreatorProfile } from "@/lib/creators";
import { TEASER_NICHES, type TeaserNiche } from "@/lib/teaserExamples";
import { attachSessionCookie, createSession } from "@/lib/session";
import { getDailyInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT, generateIdeas } from "@/lib/generateIdeas";
import { setIdeaStatus } from "@/lib/ideaHistory";

type QuickSignupPayload = {
  name?: unknown;
  gender?: unknown;
  password?: unknown;
  whatsappNumber?: unknown;
  niche?: unknown;
  toneStyle?: unknown;
  teaserTitle?: unknown;
  teaserDescription?: unknown;
  teaserType?: unknown;
};

const MAX_NAME_LENGTH = 60;

// Same placeholder scheme as the full signup route (app/api/creators/route.ts) - the `email`
// column is still NOT NULL UNIQUE at the DB level, signup itself never asks for one.
function placeholderEmail(whatsappNumber: string): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  return `${digits}@phone.nitzotz.local`;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as QuickSignupPayload | null;

  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין" }, { status: 400 });
  }

  const { name, gender, password, whatsappNumber, niche, toneStyle, teaserTitle, teaserDescription, teaserType } =
    body;

  if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "יש להזין שם" }, { status: 400 });
  }
  if (typeof gender !== "string" || !GENDERS.includes(gender as (typeof GENDERS)[number])) {
    return NextResponse.json({ error: "יש לבחור בן או בת" }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 8 תווים" }, { status: 400 });
  }
  if (typeof whatsappNumber !== "string" || !isValidIsraeliMobile(whatsappNumber)) {
    return NextResponse.json({ error: "מספר וואטסאפ לא תקין - יש להזין בפורמט 05X-XXXXXXX" }, { status: 400 });
  }
  if (typeof niche !== "string" || !TEASER_NICHES.includes(niche as TeaserNiche)) {
    return NextResponse.json({ error: "נישה לא תקינה" }, { status: 400 });
  }
  if (typeof toneStyle !== "string" || (toneStyle !== "רשמי" && toneStyle !== "קליל")) {
    return NextResponse.json({ error: "טון דיבור לא תקין" }, { status: 400 });
  }
  if (typeof teaserTitle !== "string" || typeof teaserDescription !== "string" || typeof teaserType !== "string") {
    return NextResponse.json({ error: "חסרים פרטי הרעיון המקדים" }, { status: 400 });
  }

  const trimmedName = name.trim();
  const trimmedWhatsapp = whatsappNumber.trim();

  const existingName = db.prepare("SELECT id FROM creators WHERE name = ?").get(trimmedName);
  if (existingName) {
    return NextResponse.json({ error: "השם הזה כבר תפוס - נסי שם קצת שונה" }, { status: 409 });
  }

  const existingPhone = db.prepare("SELECT id FROM creators WHERE whatsapp_number = ?").get(trimmedWhatsapp);
  if (existingPhone) {
    return NextResponse.json({ error: "כבר קיים חשבון עם מספר הוואטסאפ הזה" }, { status: 409 });
  }

  const result = db
    .prepare(
      `INSERT INTO creators (email, name, gender, password_hash, niche, tone_style, whatsapp_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(placeholderEmail(trimmedWhatsapp), trimmedName, gender, hashPassword(password), niche, toneStyle, trimmedWhatsapp);

  const creatorId = Number(result.lastInsertRowid);

  // Give the visitor visible credit for the teaser idea they already reacted to on the home
  // page: it becomes the first card of their actual first batch (not a hidden side record),
  // marked "used" (they clicked to get it) - a real reason they're not starting from zero.
  const seedIdea = {
    title: teaserTitle,
    description: teaserDescription,
    type: teaserType,
    category: "mainstream" as const,
    rationale: "הרעיון הראשון שקיבלת עוד לפני ההרשמה - כבר מותאם לנישה ולטון שבחרת.",
  };

  try {
    const profile: CreatorProfile = {
      id: creatorId,
      name: trimmedName,
      gender,
      vocabularyStyle: null,
      niche,
      toneStyle,
      usesEmojis: false,
      childrenCount: null,
      city: null,
      familyStatus: null,
      platforms: [],
      persistentContext: null,
    };
    const dailyInfo = await getDailyInfo();
    const generatedIdeas = await generateIdeas(profile, dailyInfo, DEFAULT_IDEA_COUNT, null, seedIdea);
    // The seed idea is always prepended first (see generateIdeas) - mark it "used" since the
    // visitor already actively clicked to get it, same credit the removed direct-insert gave.
    setIdeaStatus(generatedIdeas[0].id, creatorId, "used");
  } catch (error) {
    console.warn(
      `[quick-signup] Full batch generation failed for creator ${creatorId} - falling back to just the teaser idea.`,
      error,
    );
    // Best-effort fallback: at minimum, don't lose the one idea the visitor already saw and
    // reacted to, even though it won't form a full 4-item batch on its own (the dashboard
    // will show its normal empty state - "צור רעיונות" - until the creator generates one).
    try {
      const dailyInfo = await getDailyInfo();
      db.prepare(
        `INSERT INTO idea_history (creator_id, date, idea_title, idea_description, idea_type, category, rationale, status, batch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'used', ?)`,
      ).run(
        creatorId,
        dailyInfo.gregorianDate,
        seedIdea.title,
        seedIdea.description,
        seedIdea.type,
        seedIdea.category,
        seedIdea.rationale,
        `teaser-${creatorId}`,
      );
    } catch (fallbackError) {
      console.warn(`[quick-signup] Could not even record the fallback teaser idea for creator ${creatorId}`, fallbackError);
    }
  }

  const session = createSession(creatorId);
  const response = NextResponse.json({ id: creatorId }, { status: 201 });
  attachSessionCookie(response, session);

  return response;
}
