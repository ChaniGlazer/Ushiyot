import type { CreatorRow } from "./session";

export const ISRAELI_MOBILE_REGEX = /^05\d-?\d{7}$/;

export function isValidIsraeliMobile(phone: string): boolean {
  return ISRAELI_MOBILE_REGEX.test(phone.trim());
}

// Identity-neutral reframing of the old "sector" (מגזר) question: instead of asking the
// creator to self-label religiously/ethnically, we ask which world of imagery, tone and
// vocabulary they want their content to use. Functionally still drives the same AI tone
// calibration as the old sector field, just elicited less bluntly.
export const VOCABULARY_STYLES = [
  "עולם דימויים תורני ומעמיק",
  "ישראלי מודרני עם זיקה למקורות",
  "חם, אישי ומעורר השראה",
  "שפה מקצועית עסקית ישירה",
] as const;
export const TONE_STYLES = ["רשמי", "קליל"] as const;
export const PLATFORMS = ["אינסטגרם", "וואטסאפ סטטוס", "טיקטוק"] as const;
export const GENDERS = ["בן", "בת"] as const;

export type VocabularyStyle = (typeof VOCABULARY_STYLES)[number];
export type ToneStyle = (typeof TONE_STYLES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Gender = (typeof GENDERS)[number];

export type CreatorProfile = {
  id: number;
  name: string | null;
  gender: string | null;
  vocabularyStyle: string | null;
  niche: string | null;
  targetAudience: string | null;
  toneStyle: string | null;
  usesEmojis: boolean;
  childrenCount: number | null;
  city: string | null;
  familyStatus: string | null;
  platforms: string[];
  persistentContext: string | null;
  showParasha: boolean;
  whatsappNotificationsEnabled: boolean;
};

export function toCreatorProfile(row: CreatorRow): CreatorProfile {
  let platforms: string[] = [];
  try {
    const parsed: unknown = row.platforms ? JSON.parse(row.platforms) : [];
    if (Array.isArray(parsed)) {
      platforms = parsed.filter((p): p is string => typeof p === "string");
    }
  } catch {
    platforms = [];
  }

  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    vocabularyStyle: row.vocabulary_style,
    niche: row.niche,
    targetAudience: row.target_audience,
    toneStyle: row.tone_style,
    usesEmojis: row.uses_emojis === 1,
    childrenCount: row.children_count,
    city: row.city,
    familyStatus: row.family_status,
    platforms,
    persistentContext: row.persistent_context,
    showParasha: row.show_parasha === 1,
    whatsappNotificationsEnabled: row.whatsapp_notifications_enabled === 1,
  };
}

// Whether the post-signup profile questionnaire (see app/onboarding/OnboardingForm.tsx, steps
// 1-3) still has something worth going back for - checks every field it collects, not just
// niche, so someone who filled in niche+tone but skipped platforms/target audience/vocabulary
// style still gets the dashboard's reminder banner (see ProfileReminderBanner.tsx).
export function isProfileIncomplete(profile: CreatorProfile): boolean {
  return (
    !profile.niche ||
    !profile.targetAudience ||
    profile.platforms.length === 0 ||
    !profile.toneStyle ||
    !profile.vocabularyStyle
  );
}
