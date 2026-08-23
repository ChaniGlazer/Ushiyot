import { DEFAULT_MODEL_PRICING, OPENAI_MODEL_PRICING, type ModelPricing } from "./config";

const CHARS_PER_TOKEN_ESTIMATE = 3; // conservative for Hebrew-heavy prompts (overestimates rather than under)
const ESTIMATED_OUTPUT_TOKENS_PER_IDEA = 150;

/** Rough prompt size used only for the dashboard's "how much is left" display, not for billing. */
const TYPICAL_PROMPT_CHARS = 2500;

function getPricing(model: string): ModelPricing {
  return OPENAI_MODEL_PRICING[model] ?? DEFAULT_MODEL_PRICING;
}

/** Pre-flight estimate (before the call is made) from prompt length and requested idea count. */
export function estimateCallCostUsd(promptChars: number, ideaCount: number, model: string): number {
  const pricing = getPricing(model);
  const estimatedInputTokens = Math.ceil(promptChars / CHARS_PER_TOKEN_ESTIMATE);
  const estimatedOutputTokens = ideaCount * ESTIMATED_OUTPUT_TOKENS_PER_IDEA;

  return (
    (estimatedInputTokens / 1_000_000) * pricing.inputPerMillion +
    (estimatedOutputTokens / 1_000_000) * pricing.outputPerMillion
  );
}

/** Generic estimate (no real prompt at hand) used for the dashboard's remaining-budget display. */
export function estimateTypicalCallCostUsd(ideaCount: number, model: string): number {
  return estimateCallCostUsd(TYPICAL_PROMPT_CHARS, ideaCount, model);
}

/** Actual cost from the real token usage OpenAI reports after a call completes. */
export function computeActualCostUsd(promptTokens: number, completionTokens: number, model: string): number {
  const pricing = getPricing(model);
  return (promptTokens / 1_000_000) * pricing.inputPerMillion + (completionTokens / 1_000_000) * pricing.outputPerMillion;
}
