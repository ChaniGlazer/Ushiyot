import type { CreatorRow } from "./session";

export const ISRAELI_MOBILE_REGEX = /^05\d-?\d{7}$/;

export function isValidIsraeliMobile(phone: string): boolean {
  return ISRAELI_MOBILE_REGEX.test(phone.trim());
}

// Storage/lookup form of a phone number - digits only, dash stripped. isValidIsraeliMobile
// accepts the number with or without its optional dash (e.g. "050-1234567" and "0501234567"
// both pass), but whatsapp_number needs one canonical form so a login/reset lookup for a number
// typed differently than at signup still matches the same row.
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
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

// The 5 fields the post-signup profile questionnaire (app/onboarding/OnboardingForm.tsx,
// steps 1-3) collects - shared by isProfileIncomplete and getProfileCompleteness so the two
// can't drift out of sync with each other.
function profileQuestionnaireFieldsFilled(profile: CreatorProfile): boolean[] {
  return [
    Boolean(profile.niche),
    Boolean(profile.targetAudience),
    profile.platforms.length > 0,
    Boolean(profile.toneStyle),
    Boolean(profile.vocabularyStyle),
  ];
}

/** Whether the profile questionnaire still has something worth going back for - checks every
 * field it collects, not just niche, so someone who filled in niche+tone but skipped
 * platforms/target audience/vocabulary style still gets the dashboard's reminder. */
export function isProfileIncomplete(profile: CreatorProfile): boolean {
  return profileQuestionnaireFieldsFilled(profile).some((filled) => !filled);
}

/** 0-100, in steps of 20 (one per questionnaire field) - shown on the dashboard's profile
 * completion badge (see ProfileCompletionBadge.tsx). */
export function getProfileCompleteness(profile: CreatorProfile): number {
  const fields = profileQuestionnaireFieldsFilled(profile);
  const filledCount = fields.filter(Boolean).length;
  return Math.round((filledCount / fields.length) * 100);
}
