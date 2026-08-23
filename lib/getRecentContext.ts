import { db } from "./db";
import type { IdeaStatus } from "./ideaHistory";

const LOOKBACK_DAYS = 14;
const NO_HISTORY_TEXT = "אין עדיין היסטוריית רעיונות קודמת ליוצר הזה - זו ההצעה הראשונה עבורו.";

type HistoryRow = {
  idea_type: string;
  status: IdeaStatus;
  created_at: string;
};

/**
 * Code-only summary (no AI call) of the creator's last ~14 days of idea_history,
 * so generateIdeas can avoid repeating recent angles without sending raw rows to OpenAI.
 */
export function getRecentContext(creatorId: number): string {
  const rows = db
    .prepare(
      `SELECT idea_type, status, created_at
       FROM idea_history
       WHERE creator_id = ? AND created_at >= datetime('now', ?)
       ORDER BY created_at DESC`,
    )
    .all(creatorId, `-${LOOKBACK_DAYS} days`) as HistoryRow[];

  if (rows.length === 0) {
    return NO_HISTORY_TEXT;
  }

  const sentences: string[] = [];

  const typeCounts = new Map<string, number>();
  for (const row of rows) {
    typeCounts.set(row.idea_type, (typeCounts.get(row.idea_type) ?? 0) + 1);
  }
  const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topTypes.length > 0) {
    const typesText = topTypes.map(([type, count]) => `'${type}' (${count})`).join(", ");
    sentences.push(
      `ב-${LOOKBACK_DAYS} הימים האחרונים הוצעו ליוצר בעיקר רעיונות מהסוגים: ${typesText} - כדאי לגוון ולא לחזור שוב על אותן זוויות.`,
    );
  }

  const typeStats = new Map<string, { used: number; total: number }>();
  for (const row of rows) {
    const stat = typeStats.get(row.idea_type) ?? { used: 0, total: 0 };
    stat.total += 1;
    if (row.status === "used") stat.used += 1;
    typeStats.set(row.idea_type, stat);
  }
  const [bestType, bestStat] =
    [...typeStats.entries()]
      .filter(([, stat]) => stat.used > 0)
      .sort((a, b) => b[1].used / b[1].total - a[1].used / a[1].total || b[1].used - a[1].used)[0] ?? [];
  if (bestType && bestStat) {
    sentences.push(
      `רעיונות מסוג '${bestType}' עבדו טוב אצל היוצר הזה בעבר (${bestStat.used} מתוך ${bestStat.total} סומנו כ"השתמשתי בזה").`,
    );
  }

  const dismissedTypes = rows.filter((r) => r.status === "dismissed").map((r) => r.idea_type);
  const uniqueDismissed = [...new Set(dismissedTypes)].slice(0, 2);
  if (uniqueDismissed.length > 0) {
    const dismissedText = uniqueDismissed.map((t) => `'${t}'`).join(" ו-");
    sentences.push(`רעיונות מסוג ${dismissedText} נדחו לאחרונה - כדאי להימנע מכיוון דומה בקרוב.`);
  }

  return sentences.length > 0 ? sentences.join(" ") : NO_HISTORY_TEXT;
}
