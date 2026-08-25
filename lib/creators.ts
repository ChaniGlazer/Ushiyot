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
  toneStyle: string | null;
  usesEmojis: boolean;
  childrenCount: number | null;
  city: string | null;
  familyStatus: string | null;
  platforms: string[];
  persistentContext: string | null;
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
    toneStyle: row.tone_style,
    usesEmojis: row.uses_emojis === 1,
    childrenCount: row.children_count,
    city: row.city,
    familyStatus: row.family_status,
    platforms,
    persistentContext: row.persistent_context,
  };
}
