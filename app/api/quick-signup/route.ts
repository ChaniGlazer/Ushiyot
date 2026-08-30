import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { GENDERS, isValidIsraeliMobile, normalizePhone, type CreatorProfile } from "@/lib/creators";
import { attachSessionCookie, createSession } from "@/lib/session";
import { getDailyInfo } from "@/lib/hebcal";
import { DEFAULT_IDEA_COUNT, generateIdeas } from "@/lib/generateIdeas";
import { setIdeaStatus } from "@/lib/ideaHistory";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

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

// By IP only (no account/phone exists yet at this point) - each successful signup here also
// triggers a real OpenAI batch generation (see below), so this is the main defense against
// scripted account-creation spam converting directly into OpenAI spend.
const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_RATE_WINDOW_MS = 60 * 60 * 1000;

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

  if (isRateLimited(`quick-signup:ip:${getClientIp(request)}`, SIGNUP_RATE_LIMIT, SIGNUP_RATE_WINDOW_MS)) {
    return NextResponse.json({ error: "יותר מדי הרשמות מאותה כתובת - נסו שוב בעוד שעה" }, { status: 429 });
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
  if (typeof niche !== "string" || !niche.trim()) {
    return NextResponse.json({ error: "יש לציין נישה" }, { status: 400 });
  }
  if (typeof toneStyle !== "string" || (toneStyle !== "רשמי" && toneStyle !== "קליל")) {
    return NextResponse.json({ error: "טון דיבור לא תקין" }, { status: 400 });
  }
  // Optional: present only when the confirmed niche still matches the demo the visitor actually
  // looked at (see HomeTeaserWidget.handleSignup) - absent whenever they typed a different niche,
  // so a mismatched demo card is never seeded into an account it doesn't actually describe.
  const hasTeaser = teaserTitle !== undefined || teaserDescription !== undefined || teaserType !== undefined;
  if (
    hasTeaser &&
    (typeof teaserTitle !== "string" || typeof teaserDescription !== "string" || typeof teaserType !== "string")
  ) {
    return NextResponse.json({ error: "חסרים פרטי הרעיון המקדים" }, { status: 400 });
  }

  const trimmedName = name.trim();
  // Stored digits-only so a later login/reset lookup (also normalized - see app/api/login and
  // app/api/reset-password) matches regardless of whether the dash isValidIsraeliMobile allows
  // was typed at signup.
  const trimmedWhatsapp = normalizePhone(whatsappNumber);
  const trimmedNiche = niche.trim();

  // Names aren't required to be unique - two different creators can share the same name, as
  // long as their phone numbers (the account's real unique identifier) differ.
  const existingPhone = db
    .prepare("SELECT id FROM creators WHERE REPLACE(whatsapp_number, '-', '') = ?")
    .get(trimmedWhatsapp);
  if (existingPhone) {
    return NextResponse.json({ error: "כבר קיים חשבון עם מספר הוואטסאפ הזה" }, { status: 409 });
  }

  const result = db
    .prepare(
      `INSERT INTO creators (email, name, gender, password_hash, niche, tone_style, whatsapp_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(placeholderEmail(trimmedWhatsapp), trimmedName, gender, hashPassword(password), trimmedNiche, toneStyle, trimmedWhatsapp);

  const creatorId = Number(result.lastInsertRowid);

  // Give the visitor visible credit for the teaser idea they already reacted to on the home
  // page: it becomes the first card of their actual first batch (not a hidden side record),
  // marked "used" (they clicked to get it) - a real reason they're not starting from zero.
  // Only built when the teaser fields actually came through (see hasTeaser above) - otherwise
  // every card is generated fresh, on-topic for the niche actually confirmed.
  const seedIdea = hasTeaser
    ? {
        title: teaserTitle as string,
        description: teaserDescription as string,
        type: teaserType as string,
        category: "mainstream" as const,
        rationale: "הרעיון הראשון שקיבלת עוד לפני ההרשמה - כבר מותאם לנישה ולטון שבחרת.",
      }
    : null;

  try {
    const profile: CreatorProfile = {
      id: creatorId,
      name: trimmedName,
      gender,
      vocabularyStyle: null,
      niche: trimmedNiche,
      targetAudience: null,
      toneStyle,
      usesEmojis: false,
      childrenCount: null,
      city: null,
      familyStatus: null,
      platforms: [],
      persistentContext: null,
      // Matches the DB columns' own defaults for a freshly created account (see lib/migrations.ts).
      showParasha: true,
      whatsappNotificationsEnabled: true,
    };
    const dailyInfo = await getDailyInfo();
    const generatedIdeas = await generateIdeas(profile, dailyInfo, DEFAULT_IDEA_COUNT, null, seedIdea ?? undefined);
    // The seed idea, when there is one, is always prepended first (see generateIdeas) - mark it
    // "used" since the visitor already actively clicked to get it, same credit the removed
    // direct-insert gave. No seed means every card is freshly generated - none of them stands in
    // for something the visitor already reacted to, so nothing gets pre-marked "used".
    if (seedIdea) {
      setIdeaStatus(generatedIdeas[0].id, creatorId, "used");
    }
  } catch (error) {
    console.warn(`[quick-signup] Full batch generation failed for creator ${creatorId}`, error);
    // Best-effort fallback: at minimum, don't lose the one idea the visitor already saw and
    // reacted to, even though it won't form a full 4-item batch on its own (the dashboard
    // will show its normal empty state - "צור רעיונות" - until the creator generates one). If
    // there was no seed to begin with, there's nothing to fall back to - falls through to that
    // same empty-state outcome.
    if (seedIdea) {
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
  }

  const session = createSession(creatorId);
  const response = NextResponse.json({ id: creatorId }, { status: 201 });
  attachSessionCookie(response, session);

  return response;
}
