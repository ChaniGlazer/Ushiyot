export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export const DEFAULT_IDEA_COUNT = 4;

// A bare fetch() has no default timeout - without this, a hung OpenAI connection would leave
// the caller (and the full-screen "מכינים לך..." loading UI) waiting indefinitely. Generous
// relative to a typical ~15s call for a 4-idea batch, to leave room for larger batches/slower
// responses without cutting off a call that would have succeeded.
export const OPENAI_TIMEOUT_MS = 45_000;

export type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

/**
 * USD per 1,000,000 tokens. Update here if OpenAI changes pricing.
 * gpt-4o figures verified against public pricing pages as of 2026-08-19.
 */
export const OPENAI_MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
};

export const DEFAULT_MODEL_PRICING: ModelPricing = OPENAI_MODEL_PRICING["gpt-4o"];

export const DAILY_COST_LIMIT_USD = 0.5;

// A backstop across ALL creators combined, on top of the per-creator cap above - protects
// against sustained abuse that stays under the per-creator limit by spreading across many
// accounts (e.g. scripted signups from many IPs, each creating one fresh account with its own
// clean $0.50/day budget - per-IP signup rate limiting alone can't catch that if the IPs differ).
// Sized generously above today's known real usage; raise it as the legitimate user base grows.
export const GLOBAL_DAILY_COST_LIMIT_USD = 25;
