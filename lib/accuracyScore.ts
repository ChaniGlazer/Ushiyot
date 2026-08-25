import { db } from "./db";

// A trust indicator, not a real ML confidence score - see the transparency panel
// (AccuracyGauge's "מה המערכת יודעת עליי?") for what's actually stored/learned.
// Never 100%, on purpose: keeps the "still learning you" framing honest and ongoing.
export const ACCURACY_BASE = 60;
export const ACCURACY_CAP = 98;

// How many interactions it takes to close roughly half the gap to the cap - tune here.
const DIMINISHING_RETURNS_SCALE = 10;

export type AccuracyBreakdown = {
  usedCount: number;
  dismissedCount: number;
  expansionsCount: number;
};

export function getAccuracyBreakdown(creatorId: number): AccuracyBreakdown {
  const feedbackRow = db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END) as used_count,
         SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) as dismissed_count
       FROM idea_history WHERE creator_id = ?`,
    )
    .get(creatorId) as { used_count: number | null; dismissed_count: number | null };

  const creatorRow = db.prepare("SELECT expansions_count FROM creators WHERE id = ?").get(creatorId) as
    | { expansions_count: number }
    | undefined;

  return {
    usedCount: feedbackRow.used_count ?? 0,
    dismissedCount: feedbackRow.dismissed_count ?? 0,
    expansionsCount: creatorRow?.expansions_count ?? 0,
  };
}

/**
 * Diminishing-returns curve from ACCURACY_BASE up toward (never reaching) ACCURACY_CAP:
 * each additional interaction moves the score less than the one before it.
 */
export function computeAccuracyScore(interactionCount: number): number {
  const progress = 1 - 1 / (1 + Math.max(0, interactionCount) / DIMINISHING_RETURNS_SCALE);
  return Math.round(ACCURACY_BASE + (ACCURACY_CAP - ACCURACY_BASE) * progress);
}

export function getAccuracyScore(creatorId: number): number {
  const { usedCount, dismissedCount, expansionsCount } = getAccuracyBreakdown(creatorId);
  return computeAccuracyScore(usedCount + dismissedCount + expansionsCount);
}

export function getAccuracyLabel(score: number): string {
  if (score < 70) return "המערכת לומדת את ההעדפות שלך";
  if (score <= 90) return "פרופיל ה-AI מכויל ברמה גבוהה";
  return "הנכס האישי שלך מוכן ומדויק";
}

export function incrementExpansionsCount(creatorId: number): void {
  db.prepare("UPDATE creators SET expansions_count = expansions_count + 1 WHERE id = ?").run(creatorId);
}
