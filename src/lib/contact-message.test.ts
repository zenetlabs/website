import { describe, expect, it } from 'vitest';
import { assistantIntro as en } from '@/content/en/assistant-intro';
import { assistantIntro as es } from '@/content/es/assistant-intro';
import { CONTACT_MESSAGE_MAX, messageParam } from '@/lib/contact-message';
import { contactWithMessage } from '@/lib/nav';
import { parseSearch, stringifySearch } from '@/lib/search-codec';

// What a browser sends for the desk's GET form (application/x-www-form-urlencoded).
function formQuery(message: string): string {
  return `?${new URLSearchParams({ message }).toString()}`;
}

const MESSAGES = [
  ...en.suggestions,
  ...es.suggestions,
  'We copy Shopify orders into Holded by hand, 40 a day. Can you help?',
  'Necesitamos conectar PrestaShop con Holded: ¿cuánto cuesta?',
  'a+b & c=d / 50% off #1',
  'Ünïcödé, emoji 👋 and "quotes"',
  // JSON literals the default router codec would rewrite (and SSR answer 307)
  'true',
  'null',
  '1.50',
  '1e3',
  '"quoted"',
  '12345678901234567890',
  '[1, 2]',
  '{"a":1}',
];

describe('the contact prefill', () => {
  it.each(MESSAGES)(
    'round-trips %s unchanged, so SSR never answers 307',
    (message) => {
      const query = formQuery(message);
      const parsed = parseSearch(query);
      expect(stringifySearch(parsed)).toBe(query);
      expect(messageParam(parsed)).toBe(message);
    },
  );

  it('keeps the other parameters, typed, in their order', () => {
    const query = '?utm_source=news&message=1.50&tz=Europe%2FMadrid';
    const parsed = parseSearch(query);
    expect(parsed).toEqual({
      utm_source: 'news',
      message: '1.50',
      tz: 'Europe/Madrid',
    });
    expect(stringifySearch(parsed)).toBe(query);
    expect(parseSearch('?slot=1794211200000')).toEqual({
      slot: 1794211200000,
    });
  });

  it('builds the desk links the way the form encodes them', () => {
    expect(contactWithMessage('es', es.suggestions[0])).toBe(
      `/es/contacto${formQuery(es.suggestions[0])}`,
    );
  });

  it('ignores an empty or missing message and caps a long one', () => {
    expect(messageParam({})).toBeNull();
    expect(messageParam({ message: '   ' })).toBeNull();
    expect(messageParam({ message: { a: 1 } })).toBeNull();
    expect(messageParam({ message: 'x'.repeat(9000) })).toHaveLength(
      CONTACT_MESSAGE_MAX,
    );
  });
});
