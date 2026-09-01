import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Only the pages that are actually meant to be publicly indexed. Deliberately excludes
// /login, /forgot-password, /onboarding, /settings, /dashboard, /admin (all either
// require an authenticated/authorized session or are mid-flow utility pages with no
// standalone content worth surfacing in search) and /shabbat (a middleware rewrite target,
// not a real destination page - see middleware.ts). There's no DB-backed public content
// (idea_history is private per-creator, current_events is admin-only) to add here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
