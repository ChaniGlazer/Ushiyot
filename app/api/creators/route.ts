import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/passwords";
import { GENDERS, PLATFORMS, VOCABULARY_STYLES, TONE_STYLES, isValidIsraeliMobile } from "@/lib/creators";
import { attachSessionCookie, createSession } from "@/lib/session";

type CreatorPayload = {
  name?: unknown;
  gender?: unknown;
  password?: unknown;
  vocabularyStyle?: unknown;
  niche?: unknown;
  targetAudience?: unknown;
  platforms?: unknown;
  toneStyle?: unknown;
  usesEmojis?: unknown;
  childrenCount?: unknown;
  city?: unknown;
  familyStatus?: unknown;
  whatsappNumber?: unknown;
};

const MAX_NAME_LENGTH = 60;

// The `email` column is still NOT NULL UNIQUE at the DB level (kept as-is to avoid a risky
// SQLite table rebuild) - signup no longer asks for one, so this derives an internal
// placeholder from the (already-unique) phone number instead. Never shown anywhere.
function placeholderEmail(whatsappNumber: string): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  return `${digits}@phone.nitzotz.local`;
}

// Account creation itself only requires credentials (name/gender/password/whatsapp) - the rest
// of the profile (vocabulary style, niche, target audience, platforms, tone) is optional here
// and normally filled in afterward by the post-signup questionnaire via PATCH /api/profile
// (see OnboardingForm.tsx), so someone can have a real, logged-in account before answering a
// single profile question. Anything that IS provided still has to be valid, though - this
// isn't a silent "accept anything" endpoint, just one where the profile fields aren't required.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreatorPayload | null;

  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין" }, { status: 400 });
  }

  const {
    name,
    gender,
    password,
    vocabularyStyle,
    niche,
    targetAudience,
    platforms,
    toneStyle,
    usesEmojis,
    childrenCount,
    city,
    familyStatus,
    whatsappNumber,
  } = body;

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

  let vocabularyStyleValue: string | null = null;
  if (vocabularyStyle !== undefined && vocabularyStyle !== null && vocabularyStyle !== "") {
    if (
      typeof vocabularyStyle !== "string" ||
      !VOCABULARY_STYLES.includes(vocabularyStyle as (typeof VOCABULARY_STYLES)[number])
    ) {
      return NextResponse.json({ error: "יש לבחור סגנון שפה ודימויים" }, { status: 400 });
    }
    vocabularyStyleValue = vocabularyStyle;
  }

  let nicheValue: string | null = null;
  if (niche !== undefined && niche !== null && niche !== "") {
    if (typeof niche !== "string" || !niche.trim()) {
      return NextResponse.json({ error: "יש לציין נישה" }, { status: 400 });
    }
    nicheValue = niche.trim();
  }

  let targetAudienceValue: string | null = null;
  if (targetAudience !== undefined && targetAudience !== null && targetAudience !== "") {
    if (typeof targetAudience !== "string" || !targetAudience.trim()) {
      return NextResponse.json({ error: "קהל היעד לא תקין" }, { status: 400 });
    }
    targetAudienceValue = targetAudience.trim();
  }

  let platformsValue: string[] = [];
  if (platforms !== undefined && platforms !== null) {
    if (!Array.isArray(platforms) || !platforms.every((p) => PLATFORMS.includes(p as (typeof PLATFORMS)[number]))) {
      return NextResponse.json({ error: "פלטפורמה לא תקינה" }, { status: 400 });
    }
    platformsValue = platforms;
  }

  let toneStyleValue: string | null = null;
  if (toneStyle !== undefined && toneStyle !== null && toneStyle !== "") {
    if (typeof toneStyle !== "string" || !TONE_STYLES.includes(toneStyle as (typeof TONE_STYLES)[number])) {
      return NextResponse.json({ error: "טון דיבור לא תקין" }, { status: 400 });
    }
    toneStyleValue = toneStyle;
  }

  let childrenCountValue: number | null = null;
  if (childrenCount !== undefined && childrenCount !== null && childrenCount !== "") {
    const parsed = Number(childrenCount);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return NextResponse.json({ error: "מספר ילדים לא תקין" }, { status: 400 });
    }
    childrenCountValue = parsed;
  }

  const trimmedName = name.trim();
  const trimmedWhatsapp = whatsappNumber.trim();

  // Names aren't required to be unique - two different creators can share the same name, as
  // long as their phone numbers (the account's real unique identifier) differ.
  const existingPhone = db.prepare("SELECT id FROM creators WHERE whatsapp_number = ?").get(trimmedWhatsapp);
  if (existingPhone) {
    return NextResponse.json({ error: "כבר קיים חשבון עם מספר הוואטסאפ הזה" }, { status: 409 });
  }

  const result = db
    .prepare(
      `INSERT INTO creators
        (email, name, gender, password_hash, vocabulary_style, niche, target_audience, tone_style, uses_emojis, children_count, city, family_status, platforms, whatsapp_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      placeholderEmail(trimmedWhatsapp),
      trimmedName,
      gender,
      hashPassword(password),
      vocabularyStyleValue,
      nicheValue,
      targetAudienceValue,
      toneStyleValue,
      usesEmojis ? 1 : 0,
      childrenCountValue,
      typeof city === "string" && city.trim() ? city.trim() : null,
      typeof familyStatus === "string" && familyStatus ? familyStatus : null,
      JSON.stringify(platformsValue),
      trimmedWhatsapp,
    );

  const creatorId = Number(result.lastInsertRowid);

  // Deliberately does NOT pre-generate the first idea batch here - an OpenAI call for 4 ideas
  // with rationale/category takes ~15s, too slow to block the signup transaction itself, and
  // niche may not even be known yet at this point (the profile questionnaire that fills it in
  // runs after this). See OnboardingForm's post-questionnaire step for where generation happens.
  const session = createSession(creatorId);
  const response = NextResponse.json({ id: creatorId }, { status: 201 });
  attachSessionCookie(response, session);

  return response;
}
