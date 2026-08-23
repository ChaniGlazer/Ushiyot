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

/** Active events whose date range covers dateStr, relevant to sector (or tagged "הכל"). */
export function getActiveEventsForSector(sector: string | null, dateStr: string): CurrentEventRow[] {
  const rows = db
    .prepare("SELECT * FROM current_events WHERE active = 1 AND start_date <= ? AND end_date >= ?")
    .all(dateStr, dateStr) as CurrentEventRow[];

  return rows.filter((row) => {
    try {
      const sectors = JSON.parse(row.relevant_sectors) as unknown;
      if (!Array.isArray(sectors)) return false;
      return sectors.includes("הכל") || (sector !== null && sectors.includes(sector));
    } catch {
      return false;
    }
  });
}
