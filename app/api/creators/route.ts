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
  if (
    typeof vocabularyStyle !== "string" ||
    !VOCABULARY_STYLES.includes(vocabularyStyle as (typeof VOCABULARY_STYLES)[number])
  ) {
    return NextResponse.json({ error: "יש לבחור סגנון שפה ודימויים" }, { status: 400 });
  }
  if (typeof niche !== "string" || !niche.trim()) {
    return NextResponse.json({ error: "יש לציין נישה" }, { status: 400 });
  }
  if (
    !Array.isArray(platforms) ||
    platforms.length === 0 ||
    !platforms.every((p) => PLATFORMS.includes(p as (typeof PLATFORMS)[number]))
  ) {
    return NextResponse.json({ error: "יש לבחור לפחות פלטפורמה אחת" }, { status: 400 });
  }
  if (typeof toneStyle !== "string" || !TONE_STYLES.includes(toneStyle as (typeof TONE_STYLES)[number])) {
    return NextResponse.json({ error: "טון דיבור לא תקין" }, { status: 400 });
  }
  if (typeof whatsappNumber !== "string" || !isValidIsraeliMobile(whatsappNumber)) {
    return NextResponse.json({ error: "מספר וואטסאפ לא תקין - יש להזין בפורמט 05X-XXXXXXX" }, { status: 400 });
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
      `INSERT INTO creators
        (email, name, gender, password_hash, vocabulary_style, niche, tone_style, uses_emojis, children_count, city, family_status, platforms, whatsapp_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      placeholderEmail(trimmedWhatsapp),
      trimmedName,
      gender,
      hashPassword(password),
      vocabularyStyle,
      niche.trim(),
      toneStyle,
      usesEmojis ? 1 : 0,
      childrenCountValue,
      typeof city === "string" && city.trim() ? city.trim() : null,
      typeof familyStatus === "string" && familyStatus ? familyStatus : null,
      JSON.stringify(platforms),
      trimmedWhatsapp,
    );

  const creatorId = Number(result.lastInsertRowid);

  // Deliberately does NOT pre-generate the first idea batch here - an OpenAI call for 4 ideas
  // with rationale/category takes ~15s, too slow to block the signup transaction itself. The
  // client triggers /api/generate-ideas separately right after this succeeds (see
  // OnboardingForm's handleSubmit), while showing its own "מכינים לך..." loading screen.
  const session = createSession(creatorId);
  const response = NextResponse.json({ id: creatorId }, { status: 201 });
  attachSessionCookie(response, session);

  return response;
}
