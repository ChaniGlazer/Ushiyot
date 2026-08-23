export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export const DEFAULT_IDEA_COUNT = 4;

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
