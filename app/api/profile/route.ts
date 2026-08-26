import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { PLATFORMS, VOCABULARY_STYLES, TONE_STYLES } from "@/lib/creators";

type ProfilePayload = {
  vocabularyStyle?: unknown;
  niche?: unknown;
  targetAudience?: unknown;
  platforms?: unknown;
  toneStyle?: unknown;
  usesEmojis?: unknown;
  childrenCount?: unknown;
  city?: unknown;
  familyStatus?: unknown;
};

// The post-signup profile questionnaire (OnboardingForm.tsx, after account creation) submits
// here - partial by design, since every screen is skippable: only the fields actually present
// in the body get updated, so skipping a screen just means that field is omitted rather than
// sent as an empty/invalid value. Requires an active session (the account already exists by
// the time this questionnaire runs - see POST /api/creators).
export async function PATCH(request: Request) {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ProfilePayload | null;
  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין" }, { status: 400 });
  }

  const { vocabularyStyle, niche, targetAudience, platforms, toneStyle, usesEmojis, childrenCount, city, familyStatus } =
    body;
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (vocabularyStyle !== undefined) {
    if (
      typeof vocabularyStyle !== "string" ||
      !VOCABULARY_STYLES.includes(vocabularyStyle as (typeof VOCABULARY_STYLES)[number])
    ) {
      return NextResponse.json({ error: "יש לבחור סגנון שפה ודימויים" }, { status: 400 });
    }
    updates.push("vocabulary_style = ?");
    values.push(vocabularyStyle);
  }

  if (niche !== undefined) {
    if (typeof niche !== "string" || !niche.trim()) {
      return NextResponse.json({ error: "יש לציין נישה" }, { status: 400 });
    }
    updates.push("niche = ?");
    values.push(niche.trim());
  }

  if (targetAudience !== undefined) {
    if (typeof targetAudience !== "string" || !targetAudience.trim()) {
      return NextResponse.json({ error: "קהל היעד לא תקין" }, { status: 400 });
    }
    updates.push("target_audience = ?");
    values.push(targetAudience.trim());
  }

  if (platforms !== undefined) {
    if (
      !Array.isArray(platforms) ||
      platforms.length === 0 ||
      !platforms.every((p) => PLATFORMS.includes(p as (typeof PLATFORMS)[number]))
    ) {
      return NextResponse.json({ error: "יש לבחור לפחות פלטפורמה אחת" }, { status: 400 });
    }
    updates.push("platforms = ?");
    values.push(JSON.stringify(platforms));
  }

  if (toneStyle !== undefined) {
    if (typeof toneStyle !== "string" || !TONE_STYLES.includes(toneStyle as (typeof TONE_STYLES)[number])) {
      return NextResponse.json({ error: "טון דיבור לא תקין" }, { status: 400 });
    }
    updates.push("tone_style = ?");
    values.push(toneStyle);
  }

  if (usesEmojis !== undefined) {
    updates.push("uses_emojis = ?");
    values.push(usesEmojis ? 1 : 0);
  }

  if (childrenCount !== undefined) {
    if (childrenCount !== null) {
      const parsed = Number(childrenCount);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json({ error: "מספר ילדים לא תקין" }, { status: 400 });
      }
      updates.push("children_count = ?");
      values.push(parsed);
    } else {
      updates.push("children_count = ?");
      values.push(null);
    }
  }

  if (city !== undefined) {
    updates.push("city = ?");
    values.push(typeof city === "string" && city.trim() ? city.trim() : null);
  }

  if (familyStatus !== undefined) {
    updates.push("family_status = ?");
    values.push(typeof familyStatus === "string" && familyStatus ? familyStatus : null);
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true });
  }

  db.prepare(`UPDATE creators SET ${updates.join(", ")} WHERE id = ?`).run(...values, creator.id);

  return NextResponse.json({ ok: true });
}
