// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sharedRules } from '@/server/chat/prompt';
import { voicePrompt } from '@/server/voice/prompt';
import { siteConfig } from '../../../site.config';

const production = siteConfig('production');
const SITE = {
  calculator: production.calculator,
  booking: { published: true },
};
const NAMES = [
  'get_faq',
  'get_pricing',
  'check_availability',
  'book_meeting',
  'navigate',
  'end_call',
];

describe.each(['en', 'es'] as const)('voicePrompt (%s)', (locale) => {
  it('carries the shared rules word for word', async () => {
    const prompt = await voicePrompt(locale, SITE, NAMES);
    const features = { booking: true, estimate: false };
    const rules = sharedRules(locale, features);
    for (const key of [
      'facts',
      'prices',
      'scope',
      'instructions',
      'honesty',
      'legal',
    ] as const) {
      expect(prompt, key).toContain(rules[key]);
    }
    expect(prompt).toContain(rules.header);
  });

  it('has none of the chat-only rules and no chat canary', async () => {
    const prompt = await voicePrompt(locale, SITE, NAMES);
    expect(prompt).not.toMatch(
      /ZL-ASSIST|THIS TURN|ESTE TURNO|VISITOR MESSAGE|120 words|120 palabras|Markdown/,
    );
  });

  it('ends with the call block holding the only variables', async () => {
    const prompt = await voicePrompt(locale, SITE, NAMES);
    expect(prompt.match(/\{\{[^}]+\}\}/g)).toEqual([
      '{{system__time}}',
      '{{system__timezone}}',
    ]);
    expect(prompt.lastIndexOf('{{system__time}}')).toBeGreaterThan(
      prompt.indexOf('KNOWLEDGE') > -1
        ? prompt.indexOf('KNOWLEDGE')
        : prompt.indexOf('CONOCIMIENTO'),
    );
  });

  it('stays short enough, free of placeholders and in the right market', async () => {
    const prompt = await voicePrompt(locale, SITE, NAMES);
    expect(prompt.length).toBeLessThanOrEqual(32_000);
    expect(prompt).not.toMatch(/TODO|\[X\]|https?:\/\//);
    expect(prompt).not.toContain(locale === 'en' ? '€' : 'S$');
  });
});
