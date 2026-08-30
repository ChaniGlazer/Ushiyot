import { db } from "./db";
import { DAILY_COST_LIMIT_USD, DEFAULT_IDEA_COUNT, GLOBAL_DAILY_COST_LIMIT_USD, OPENAI_MODEL } from "./config";
import { estimateTypicalCallCostUsd } from "./costEstimate";

export const DAILY_LIMIT_MESSAGE = "כבר יצרת מלא ניצוצות תוכן היום ✨ מחר מחכה לך סבב טרי.";
export const GLOBAL_DAILY_LIMIT_MESSAGE = "המערכת עמוסה כרגע, נסו שוב בעוד כמה שעות או מחר.";

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

/**
 * Atomically checks the daily cost cap AND reserves `estimatedCostUsd` against it in a single
 * SQL statement (the INSERT...ON CONFLICT...WHERE below), closing the check-then-write race two
 * concurrent calls could otherwise exploit: the old wouldExceedDailyLimit()/recordApiUsage() pair
 * were two separate statements with the OpenAI fetch() awaited in between, so two overlapping
 * requests for the same creator could both read the same "before" usage and both pass the check.
 * Returns true if the reservation succeeded (the call may proceed) - false if it would push the
 * day's total over DAILY_COST_LIMIT_USD, in which case nothing was written.
 *
 * Callers must call refundApiUsage() with the same amount if the reserved call then fails (so a
 * failed call doesn't permanently cost budget), or adjustApiUsage() with the actual-vs-estimated
 * delta once a successful call's real cost is known.
 */
export function reserveApiUsage(creatorId: number, estimatedCostUsd: number): boolean {
  const result = db
    .prepare(
      `INSERT INTO api_usage (creator_id, date, call_count, estimated_cost_usd)
       VALUES (?, ?, 1, ?)
       ON CONFLICT (creator_id, date) DO UPDATE SET
         call_count = call_count + 1,
         estimated_cost_usd = estimated_cost_usd + excluded.estimated_cost_usd
       WHERE api_usage.estimated_cost_usd + excluded.estimated_cost_usd <= ?`,
    )
    .run(creatorId, todayIsrael(), estimatedCostUsd, DAILY_COST_LIMIT_USD);

  return result.changes > 0;
}

/** Undoes a reserveApiUsage() reservation after the reserved call actually failed (network
 * error, non-OK OpenAI response, etc.) - a failed call shouldn't permanently count against the
 * daily cap or the displayed call count. */
export function refundApiUsage(creatorId: number, estimatedCostUsd: number): void {
  db.prepare(
    `UPDATE api_usage SET call_count = MAX(0, call_count - 1), estimated_cost_usd = estimated_cost_usd - ?
     WHERE creator_id = ? AND date = ?`,
  ).run(estimatedCostUsd, creatorId, todayIsrael());
}

/** Corrects an already-reserved call's cost once the real OpenAI token usage is known (actual
 * cost usually differs slightly from the pre-call estimate reserveApiUsage() used). Only ever
 * applied after reserveApiUsage() already succeeded for this exact call, so it can't itself let
 * a call bypass the cap - it's bookkeeping, not another gate. Doesn't touch call_count. */
export function adjustApiUsage(creatorId: number, deltaUsd: number): void {
  if (deltaUsd === 0) return;
  db.prepare(`UPDATE api_usage SET estimated_cost_usd = estimated_cost_usd + ? WHERE creator_id = ? AND date = ?`).run(
    deltaUsd,
    creatorId,
    todayIsrael(),
  );
}

/**
 * Backstop across ALL creators combined - see GLOBAL_DAILY_COST_LIMIT_USD's comment in
 * lib/config.ts for why this exists on top of the per-creator cap. A plain read-then-decide
 * check (not an atomic reservation like reserveApiUsage) - proportionate for a coarse,
 * slow-abuse backstop rather than a tight concurrency guarantee, and avoids needing a single
 * shared counter row that every creator's call would contend on.
 */
export function wouldExceedGlobalDailyLimit(estimatedCostUsd: number): boolean {
  const row = db
    .prepare("SELECT COALESCE(SUM(estimated_cost_usd), 0) as total FROM api_usage WHERE date = ?")
    .get(todayIsrael()) as { total: number };

  return row.total + estimatedCostUsd > GLOBAL_DAILY_COST_LIMIT_USD;
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
