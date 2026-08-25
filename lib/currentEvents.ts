import { db } from "./db";

export type CurrentEventRow = {
  id: number;
  title: string;
  description: string;
  relevant_sectors: string;
  start_date: string;
  end_date: string;
  active: number;
  created_at: string;
};

/**
 * Active events whose date range covers dateStr, relevant to vocabularyStyle (or tagged "הכל").
 * The underlying column is still named `relevant_sectors` (pre-dates the sector -> vocabulary
 * style rename) - left as-is to avoid an unnecessary table rebuild, same convention as
 * `creators.sector` itself. It stores vocabulary-style tag strings now, not sector labels.
 */
export function getActiveEventsForVocabularyStyle(vocabularyStyle: string | null, dateStr: string): CurrentEventRow[] {
  const rows = db
    .prepare("SELECT * FROM current_events WHERE active = 1 AND start_date <= ? AND end_date >= ?")
    .all(dateStr, dateStr) as CurrentEventRow[];

  return rows.filter((row) => {
    try {
      const tags = JSON.parse(row.relevant_sectors) as unknown;
      if (!Array.isArray(tags)) return false;
      return tags.includes("הכל") || (vocabularyStyle !== null && tags.includes(vocabularyStyle));
    } catch {
      return false;
    }
  });
}
