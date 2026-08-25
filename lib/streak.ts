import { db } from "./db";
import { getRestDaysInRange } from "./hebcal";

// Beyond this many missed calendar days, don't even bother checking Hebcal - there's no
// realistic Shabbat/chag stretch this long, so the streak is simply broken.
const MAX_GAP_TO_CHECK = 10;

export type StreakResult = {
  count: number;
  /** True only on the visit that discovers the gap since last time was entirely Shabbat/chag. */
  justFroze: boolean;
};

type StreakRow = {
  streak_count: number;
  streak_last_active_date: string | null;
};

// Pure UTC arithmetic (noon, to stay clear of any DST edge) - avoids any dependence on the
// server process's local timezone, unlike a bare `new Date(dateStr + "T12:00:00")` would have.
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

/** Calendar dates strictly between start and end (exclusive on both ends), in order. */
function datesBetweenExclusive(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let d = addDays(start, 1); d < end; d = addDays(d, 1)) {
    dates.push(d);
  }
  return dates;
}

function setStreak(creatorId: number, count: number, dateIso: string): void {
  db.prepare("UPDATE creators SET streak_count = ?, streak_last_active_date = ? WHERE id = ?").run(
    count,
    dateIso,
    creatorId,
  );
}

/**
 * Call once per dashboard load with today's Israel-local date. Advances the creator's streak
 * by exactly one step (or resets it) the first time it's called on a given day - safe to call
 * on every load since same-day repeats are a no-op.
 *
 * A gap since the last visit doesn't break the streak if every day in the gap was Shabbat or
 * a Yom Tov (per Hebcal) - those days are silently "frozen" rather than counted as missed.
 */
export async function touchStreak(creatorId: number, todayIso: string): Promise<StreakResult> {
  const row = db
    .prepare("SELECT streak_count, streak_last_active_date FROM creators WHERE id = ?")
    .get(creatorId) as StreakRow | undefined;

  if (!row) return { count: 0, justFroze: false };

  if (!row.streak_last_active_date) {
    setStreak(creatorId, 1, todayIso);
    return { count: 1, justFroze: false };
  }

  if (row.streak_last_active_date >= todayIso) {
    // Already touched today (or a clock-skew edge case) - leave as-is.
    return { count: row.streak_count, justFroze: false };
  }

  const gapDates = datesBetweenExclusive(row.streak_last_active_date, todayIso);

  if (gapDates.length === 0) {
    // Yesterday -> today: a plain consecutive day.
    const count = row.streak_count + 1;
    setStreak(creatorId, count, todayIso);
    return { count, justFroze: false };
  }

  if (gapDates.length > MAX_GAP_TO_CHECK) {
    setStreak(creatorId, 1, todayIso);
    return { count: 1, justFroze: false };
  }

  // Best-effort: a Hebcal hiccup just means the streak breaks like a real missed day would,
  // rather than blocking the dashboard render.
  let restDays: Set<string>;
  try {
    restDays = await getRestDaysInRange(gapDates[0], gapDates[gapDates.length - 1]);
  } catch {
    setStreak(creatorId, 1, todayIso);
    return { count: 1, justFroze: false };
  }

  const allFrozen = gapDates.every((d) => restDays.has(d));

  if (!allFrozen) {
    setStreak(creatorId, 1, todayIso);
    return { count: 1, justFroze: false };
  }

  const count = row.streak_count + 1;
  db.prepare(
    "UPDATE creators SET streak_count = ?, streak_last_active_date = ?, streak_frozen_total = streak_frozen_total + ? WHERE id = ?",
  ).run(count, todayIso, gapDates.length, creatorId);

  return { count, justFroze: true };
}
