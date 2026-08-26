import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentCreator } from "@/lib/auth";
import { PLATFORMS, TONE_STYLES, toCreatorProfile } from "@/lib/creators";

const MAX_NAME_LENGTH = 60;

type SettingsPayload = {
  name?: unknown;
  niche?: unknown;
  targetAudience?: unknown;
  platforms?: unknown;
  toneStyle?: unknown;
  showParasha?: unknown;
  whatsappNotificationsEnabled?: unknown;
};

// Backs app/settings - every field the logged-in creator can see/edit about themselves.
// Overlaps in scope with PATCH /api/profile (the post-signup questionnaire's endpoint), which
// is left as-is on purpose: this route additionally owns the display name and the boolean
// preferences (show_parasha / whatsapp_notifications_enabled) that only the settings page ever
// touches, and keeping the two routes independent means neither risks the other's already-working
// callers. Shabbat mode is deliberately NOT a per-user setting - the site blocks everyone during
// Shabbat unconditionally (see middleware.ts), by explicit product decision.
export async function GET() {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const profile = toCreatorProfile(creator);
  return NextResponse.json({
    name: profile.name,
    niche: profile.niche,
    targetAudience: profile.targetAudience,
    platforms: profile.platforms,
    toneStyle: profile.toneStyle,
    showParasha: profile.showParasha,
    whatsappNotificationsEnabled: profile.whatsappNotificationsEnabled,
  });
}

export async function PATCH(request: Request) {
  const creator = await getCurrentCreator();
  if (!creator) {
    return NextResponse.json({ error: "יש להתחבר" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as SettingsPayload | null;
  if (!body) {
    return NextResponse.json({ error: "גוף הבקשה לא תקין" }, { status: 400 });
  }

  const { name, niche, targetAudience, platforms, toneStyle, showParasha, whatsappNotificationsEnabled } = body;
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: "יש להזין שם" }, { status: 400 });
    }
    // Names aren't required to be unique - two different creators can share the same name, as
    // long as their phone numbers (the account's real unique identifier) differ.
    updates.push("name = ?");
    values.push(name.trim());
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

  if (showParasha !== undefined) {
    updates.push("show_parasha = ?");
    values.push(showParasha ? 1 : 0);
  }

  if (whatsappNotificationsEnabled !== undefined) {
    updates.push("whatsapp_notifications_enabled = ?");
    values.push(whatsappNotificationsEnabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: true });
  }

  db.prepare(`UPDATE creators SET ${updates.join(", ")} WHERE id = ?`).run(...values, creator.id);

  return NextResponse.json({ ok: true });
}
