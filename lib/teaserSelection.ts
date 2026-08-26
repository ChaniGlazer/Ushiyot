"use client";

// Bridges a niche/tone choice made in the anonymous home-page teaser (HomeTeaserWidget) across
// to the post-signup profile questionnaire (OnboardingForm), so someone who already told us
// what they're into doesn't have to repeat it right after registering. There's no server
// session yet at the point this is written (the visitor isn't signed up), so localStorage is
// the only option - sessionStorage would be cleared by the redirect-heavy signup flow (a new
// tab/window during OAuth-style flows, or simply Next.js's client-side navigation in some
// browsers clearing per-tab storage), and localStorage's normal lifetime (until explicitly
// cleared) is fine here since this is consumed-once-then-cleared immediately after use anyway.
const STORAGE_KEY = "nitzotz-teaser-selection";

export type TeaserSelection = { niche: string; tone: string };

export function saveTeaserSelection(selection: TeaserSelection): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Storage unavailable (private browsing, disabled) - the teaser widget still works without
    // this, the post-signup questionnaire just won't have a prefilled default.
  }
}

export function readTeaserSelection(): TeaserSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as TeaserSelection).niche === "string" &&
      typeof (parsed as TeaserSelection).tone === "string"
    ) {
      return parsed as TeaserSelection;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearTeaserSelection(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignored - nothing to clean up if storage isn't available in the first place
  }
}
