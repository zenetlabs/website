import type { ChatModelId } from '../../../site.config';

export type TurnUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

export const NO_USAGE: TurnUsage = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
};

type Rate = { input: number; cachedInput?: number; output: number };

// Neurons per million tokens. Cloudflare pricing page, checked 2026-10-30.
const NEURONS_PER_M: Record<ChatModelId, Rate> = {
  '@cf/zai-org/glm-4.7-flash': { input: 5_500, output: 36_400 },
  '@cf/google/gemma-4-26b-a4b-it': { input: 9_091, output: 27_273 },
  '@cf/meta/llama-4-scout-17b-16e-instruct': { input: 24_545, output: 77_273 },
};

function isRealModel(model: string): model is ChatModelId {
  return model in NEURONS_PER_M;
}

export function neuronsFor(model: string, usage: TurnUsage): number {
  if (!isRealModel(model)) return 0;
  const rate = NEURONS_PER_M[model];
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const cached = usage.cachedInputTokens * (rate.cachedInput ?? rate.input);
  return Math.ceil(
    (uncached * rate.input + cached + usage.outputTokens * rate.output) / 1e6,
  );
}

// A provider that reports no usage is billed from the text length instead.
export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 3);
}

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

// What a turn is expected to cost, set aside before it runs: two steps that
// each send a 9,000-token prompt, and a full-length answer. Most turns cost
// less; the day's total is corrected afterwards.
export function reservationFor(model: string): number {
  return neuronsFor(model, {
    inputTokens: 18_000,
    cachedInputTokens: 0,
    outputTokens: 600,
  });
}
