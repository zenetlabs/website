// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NAVIGATE_SECTIONS } from '@/lib/navigate';
import { sharedRules } from '@/server/chat/prompt';
import { voicePrompt } from '@/server/voice/prompt';
import { siteConfig } from '../../../site.config';

const production = siteConfig('production');
const SITE = {
  calculator: production.calculator,
  booking: { published: true },
};

const KNOWN_SECTIONS = ['services', 'cases', 'faq', 'contact'] as const;

function namedMissingSections(prompt: string): string[] {
  return KNOWN_SECTIONS.filter(
    (name) =>
      !NAVIGATE_SECTIONS.some((section) => section === name) &&
      new RegExp(
        `${name} section|sección de ${name}|sección de contacto`,
        'i',
      ).test(prompt),
  );
}

const NAMES = [
  'get_faq',
  'get_pricing',
  'check_availability',
  'book_meeting',
  'navigate',
  'search_site',
  'get_page',
  'open_contact_form',
  'end_call',
];

describe.each(['en', 'es'] as const)('voicePrompt (%s)', (locale) => {
  it.each([true, false])(
    'names no navigate section that does not exist (booking %s)',
    async (published) => {
      const prompt = await voicePrompt(
        locale,
        { ...SITE, booking: { published } },
        NAMES,
      );
      expect(namedMissingSections(prompt)).toEqual([]);
    },
  );

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

  it('has policy lines for search and the contact draft, and states the personal-data rule once', async () => {
    const prompt = await voicePrompt(locale, SITE, NAMES);
    for (const name of ['search_site', 'get_page', 'open_contact_form']) {
      expect(prompt, name).toContain(`- ${name}: `);
    }
    expect(prompt).not.toContain('list_pages');
    const rule =
      locale === 'en'
        ? 'in a message for the contact form'
        : 'en un mensaje para el formulario de contacto';
    expect(prompt.split(rule)).toHaveLength(2);
    expect(prompt).toMatch(
      locale === 'en' ? /only after a yes/ : /solo después de un sí/,
    );
  });

  it('offers the draft after a yes while booking is dark', async () => {
    const prompt = await voicePrompt(
      locale,
      { ...SITE, booking: { published: false } },
      NAMES,
    );
    expect(prompt).toContain('open_contact_form ');
  });
});
