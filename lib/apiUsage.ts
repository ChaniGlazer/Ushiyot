import { db } from "./db";
import { DAILY_COST_LIMIT_USD, DEFAULT_IDEA_COUNT, OPENAI_MODEL } from "./config";
import { estimateTypicalCallCostUsd } from "./costEstimate";

export const DAILY_LIMIT_MESSAGE = "כבר יצרת מלא ניצוצות תוכן היום ✨ מחר מחכה לך סבב טרי.";

export type DailyUsage = {
  callCount: number;
  estimatedCostUsd: number;
};

function todayIsrael(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getDailyUsage(creatorId: number): DailyUsage {
  const row = db
    .prepare("SELECT call_count, estimated_cost_usd FROM api_usage WHERE creator_id = ? AND date = ?")
    .get(creatorId, todayIsrael()) as { call_count: number; estimated_cost_usd: number } | undefined;

  return { callCount: row?.call_count ?? 0, estimatedCostUsd: row?.estimated_cost_usd ?? 0 };
}

export function wouldExceedDailyLimit(creatorId: number, estimatedCallCostUsd: number): boolean {
  const usage = getDailyUsage(creatorId);
  return usage.estimatedCostUsd + estimatedCallCostUsd > DAILY_COST_LIMIT_USD;
}

export function recordApiUsage(creatorId: number, costUsd: number): void {
  db.prepare(
    `INSERT INTO api_usage (creator_id, date, call_count, estimated_cost_usd)
     VALUES (?, ?, 1, ?)
     ON CONFLICT (creator_id, date)
     DO UPDATE SET call_count = call_count + 1, estimated_cost_usd = estimated_cost_usd + excluded.estimated_cost_usd`,
  ).run(creatorId, todayIsrael(), costUsd);
}

/**
 * Non-technical, dollar-free estimate for the dashboard: roughly how many
 * more idea-generation batches the creator can request today.
 */
export function getRemainingIdeaBatchesEstimate(creatorId: number): number {
  const usage = getDailyUsage(creatorId);
  const remainingBudget = Math.max(0, DAILY_COST_LIMIT_USD - usage.estimatedCostUsd);
  const typicalBatchCost = estimateTypicalCallCostUsd(DEFAULT_IDEA_COUNT, OPENAI_MODEL);

  if (typicalBatchCost <= 0) return 0;

  return Math.floor(remainingBudget / typicalBatchCost);
}
