import { describe, expect, it } from 'vitest';
import { estimateTokens, neuronsFor, utcDay } from '@/server/chat/usage';

describe('neuronsFor', () => {
  it('prices glm input and output per million tokens, rounded up', () => {
    // 8,500 in at 5,500/M plus 200 out at 36,400/M = 46.75 + 7.28 = 54.03
    expect(
      neuronsFor('@cf/zai-org/glm-4.7-flash', {
        inputTokens: 8_500,
        cachedInputTokens: 0,
        outputTokens: 200,
      }),
    ).toBe(55);
  });

  it.each([
    ['@cf/google/gemma-4-26b-a4b-it', 1_000_000, 0, 9_091],
    ['@cf/google/gemma-4-26b-a4b-it', 0, 1_000_000, 27_273],
    ['@cf/meta/llama-4-scout-17b-16e-instruct', 1_000_000, 0, 24_545],
    ['@cf/meta/llama-4-scout-17b-16e-instruct', 0, 1_000_000, 77_273],
  ])('%s at %d in / %d out is %d neurons', (model, input, output, expected) => {
    expect(
      neuronsFor(model, {
        inputTokens: input,
        cachedInputTokens: 0,
        outputTokens: output,
      }),
    ).toBe(expected);
  });

  it('bills cached input at the input rate when no cached rate exists', () => {
    const usage = {
      inputTokens: 10_000,
      cachedInputTokens: 4_000,
      outputTokens: 0,
    };
    expect(neuronsFor('@cf/zai-org/glm-4.7-flash', usage)).toBe(55);
  });

  it('is zero for the scripted model and for no usage', () => {
    expect(
      neuronsFor('fake', {
        inputTokens: 1_000,
        cachedInputTokens: 0,
        outputTokens: 50,
      }),
    ).toBe(0);
    expect(
      neuronsFor('@cf/zai-org/glm-4.7-flash', {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
      }),
    ).toBe(0);
  });
});

describe('estimateTokens and utcDay', () => {
  it('estimates three characters per token', () => {
    expect(estimateTokens(0)).toBe(0);
    expect(estimateTokens(10)).toBe(4);
  });

  it('cuts the day at midnight UTC', () => {
    expect(utcDay(Date.UTC(2026, 10, 1, 23, 59, 59, 999))).toBe('2026-11-01');
    expect(utcDay(Date.UTC(2026, 10, 2, 0, 0, 0, 0))).toBe('2026-11-02');
  });
});
