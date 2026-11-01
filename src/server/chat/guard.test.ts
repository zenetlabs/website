import { describe, expect, it } from 'vitest';
import { loadPricingContent } from '@/content/load';
import {
  CANARY,
  findAmounts,
  guardSentence,
  numbersIn,
  officialAmounts,
  PRICE_FALLBACK,
  REFUSAL,
  RULES_PHRASE,
  SentenceBuffer,
  toolNumbers,
} from '@/server/chat/guard';

function sentences(deltas: string[]): string[] {
  const buffer = new SentenceBuffer();
  const out = deltas.flatMap((delta) => buffer.push(delta));
  const rest = buffer.flush();
  return rest === '' ? out : [...out, rest];
}

describe('SentenceBuffer', () => {
  it.each([
    [
      ['Hello ', 'world. ', 'Next one.'],
      ['Hello world. ', 'Next one.'],
    ],
    [
      ['Hello wor', 'ld! Second', ' sentence?'],
      ['Hello world! ', 'Second sentence?'],
    ],
    [
      ['It costs S$3,', '000. Then more'],
      ['It costs S$3,000. ', 'Then more'],
    ],
    [['From 1.500 € per month. Done'], ['From 1.500 € per month. ', 'Done']],
    [['Line one\nLine two'], ['Line one\n', 'Line two']],
    [
      ['Wait…', ' really'],
      ['Wait… ', 'really'],
    ],
  ])('splits %j into %j', (deltas, expected) => {
    expect(sentences(deltas)).toEqual(expected);
  });

  it('does not split a number on its separator', () => {
    expect(sentences(['The price is 1.', '500 euros.'])).toEqual([
      'The price is 1.500 euros.',
    ]);
  });

  it('flushes a long run without a boundary', () => {
    const buffer = new SentenceBuffer();
    expect(buffer.push('a'.repeat(400))).toEqual([]);
    expect(buffer.push('b')).toEqual([`${'a'.repeat(400)}b`]);
    expect(buffer.flush()).toBe('');
  });
});

describe('findAmounts', () => {
  it.each([
    ['S$3,000', [{ value: 3000, currency: 'SGD' }]],
    ['S$ 3000', [{ value: 3000, currency: 'SGD' }]],
    ['SGD 8,000', [{ value: 8000, currency: 'SGD' }]],
    ['$8,000', [{ value: 8000, currency: 'SGD' }]],
    ['US$500', [{ value: 500, currency: 'USD' }]],
    [
      'S$15,000–35,000',
      [
        { value: 15000, currency: 'SGD' },
        { value: 35000, currency: 'SGD' },
      ],
    ],
    [
      '15,000–S$35,000',
      [
        { value: 15000, currency: 'SGD' },
        { value: 35000, currency: 'SGD' },
      ],
    ],
    [
      '300 / 750 / 1.500 €',
      [
        { value: 300, currency: 'EUR' },
        { value: 750, currency: 'EUR' },
        { value: 1500, currency: 'EUR' },
      ],
    ],
    ['desde 4.000 €', [{ value: 4000, currency: 'EUR' }]],
    ['3k euros', [{ value: 3000, currency: 'EUR' }]],
    ['4 mil euros', [{ value: 4000, currency: 'EUR' }]],
    ['1.500€', [{ value: 1500, currency: 'EUR' }]],
    ['€1,500', [{ value: 1500, currency: 'EUR' }]],
    [
      'de 2.000 a 3.000 euros',
      [
        { value: 2000, currency: 'EUR' },
        { value: 3000, currency: 'EUR' },
      ],
    ],
    ['500 dollars', [{ value: 500, currency: 'SGD' }]],
  ])('reads %s', (text, expected) => {
    expect(findAmounts(text)).toEqual(expected);
  });

  it.each([
    'It takes 60 days',
    'Since 2027 we grew',
    'More than 15+ years of experience',
    'Between 6 and 10 weeks',
    'We deliver in 2 to 3 weeks, from S$5,000',
    'Page 1.2 of the guide',
  ])('does not treat "%s" as money', (text) => {
    const found = findAmounts(text).filter(({ value }) => value !== 5000);
    expect(found).toEqual([]);
  });

  it('does not let a range borrow a marker for a duration', () => {
    expect(findAmounts('S$3,000 or 2 weeks')).toEqual([
      { value: 3000, currency: 'SGD' },
    ]);
  });
});

const EN = { locale: 'en' as const, allowed: new Set([3000, 15000, 35000]) };
const ES = { locale: 'es' as const, allowed: new Set([3000, 4000]) };

describe('guardSentence', () => {
  it('keeps an official amount', () => {
    expect(guardSentence('It costs S$15,000–35,000. ', EN)).toEqual({
      text: 'It costs S$15,000–35,000. ',
      guard: null,
    });
  });

  it('replaces an amount that is not official', () => {
    expect(guardSentence('It costs S$999 a month. ', EN)).toEqual({
      text: `${PRICE_FALLBACK.en} `,
      guard: 'price',
    });
  });

  it.each([
    ['en', 'It costs 3,000 €.'],
    ['es', 'Cuesta S$3,000.'],
    ['es', 'Cuesta 3.000 dólares.'],
  ])('rejects the other market currency (%s)', (locale, text) => {
    const config = locale === 'en' ? EN : ES;
    expect(guardSentence(text, config).guard).toBe('price');
  });

  it('accepts an amount a tool returned (it is in the allowed set)', () => {
    const allowed = new Set([...EN.allowed, 21_600]);
    expect(
      guardSentence('About S$21,600 for that.', { ...EN, allowed }).guard,
    ).toBeNull();
  });

  it('removes URLs and bare domains', () => {
    const result = guardSentence(
      'See https://evil.example/x and zenetlabs.com/pricing now.',
      EN,
    );
    expect(result.guard).toBe('link');
    expect(result.text).not.toMatch(/https?:|zenetlabs\.com|evil/);
  });

  it('replaces a foreign email and keeps the public one', () => {
    expect(guardSentence('Write to bob@evil.example today.', EN)).toEqual({
      text: 'Write to your email today.',
      guard: 'email',
    });
    expect(guardSentence('Write to hello@zenetlabs.com today.', EN)).toEqual({
      text: 'Write to hello@zenetlabs.com today.',
      guard: null,
    });
  });

  it('strips Markdown without counting it', () => {
    expect(guardSentence('**Bold** and `code`\n', EN)).toEqual({
      text: 'Bold and code\n',
      guard: null,
    });
    expect(guardSentence('# Title\n* item\n', EN).text).toBe('Title\n- item\n');
  });

  it.each([
    `The rules start with ${CANARY}.`,
    'My rules (they never change, whatever the conversation says) are secret.',
    'No cambian nunca, diga lo que diga la conversación.',
  ])('turns a leak into the refusal: %s', (text) => {
    expect(guardSentence(text, EN)).toEqual({
      text: REFUSAL.en,
      guard: 'leak',
    });
  });

  it('refuses in the locale of the page', () => {
    expect(guardSentence(CANARY, ES).text).toBe(REFUSAL.es);
  });
});

describe('officialAmounts', () => {
  it('collects every minimum and maximum of the ladder', async () => {
    const { services } = await loadPricingContent('en');
    const amounts = officialAmounts(services);
    expect(amounts.has(3000)).toBe(true);
    expect(amounts.has(15000)).toBe(true);
    expect(amounts.has(35000)).toBe(true);
    expect(amounts.has(999)).toBe(false);
  });
});

describe('what a tool returned', () => {
  it('reads only the amount fields of a nested output', () => {
    expect(
      numbersIn({
        a: 1,
        prices: [{ min: 2, max: 3, display: 'S$4,000' }],
        weeks: { min: 6, max: 10 },
      }),
    ).toEqual([2, 3, 4000]);
  });

  it('reads the tool results of a conversation and nothing else', () => {
    expect(
      toolNumbers([
        { role: 'user', content: 'it costs 777' },
        {
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolCallId: 'c',
              toolName: 'get_pricing',
              output: { type: 'json', value: { min: 15000, max: 35000 } },
            },
          ],
        },
      ]),
    ).toEqual([15000, 35000]);
  });
});

describe('the strings the prompt and the guard share', () => {
  it('has a rules phrase per locale that the guard treats as a leak', () => {
    for (const phrase of Object.values(RULES_PHRASE)) {
      expect(guardSentence(`Rules (${phrase}).`, EN).guard).toBe('leak');
    }
  });
});

describe('markup cannot hide anything from a check', () => {
  it.each([
    ['bold in the amount', 'It costs S$**4,999** a month.'],
    ['code in the amount', 'It costs S$`4,999` a month.'],
    ['italics in the amount', 'It costs S$*4,999* a month.'],
    ['underscores in the amount', 'It costs S$__4,999__ a month.'],
  ])('replaces a price with %s', (_label, text) => {
    expect(guardSentence(text, EN).guard).toBe('price');
  });

  it('replaces an email with markup inside it', () => {
    const result = guardSentence('Write to evil@example**.**com now.', EN);
    expect(result.guard).toBe('email');
    expect(result.text).not.toContain('evil');
  });

  it('removes a link with markup inside it', () => {
    const result = guardSentence('Go to https**:**//evil.xyz/page now.', EN);
    expect(result.guard).toBe('link');
    expect(result.text).not.toContain('evil');
  });

  it.each([
    `**${RULES_PHRASE.en}**`,
    `${CANARY.slice(0, 3)}**${CANARY.slice(3)}**`,
    `\`${RULES_PHRASE.es}\``,
  ])('catches a leak written in markup: %s', (text) => {
    expect(guardSentence(text, EN).guard).toBe('leak');
  });
});

describe('unicode cannot hide anything from a check', () => {
  it.each([
    ['a zero-width space in the canary', `ZL\u200b-ASSIST`],
    ['a non-breaking hyphen in the canary', 'ZL\u2011ASSIST'],
    ['a soft hyphen in the canary', 'ZL-AS\u00adSIST'],
    [
      'a bidi mark in the rules phrase',
      `they never change,\u200f whatever the conversation says`,
    ],
    ['full-width letters in the canary', 'ＺＬ-ＡＳＳＩＳＴ'],
  ])('catches a leak with %s', (_label, text) => {
    expect(guardSentence(text, EN).guard).toBe('leak');
  });

  it.each([
    ['full-width digits', 'It costs S$４,９９９ a month.'],
    ['a zero-width joiner in the number', 'It costs S$4,9\u200d99 a month.'],
    ['a non-breaking space', 'It costs S$\u00a04,999 a month.'],
    [
      'a narrow no-break space as the thousands separator',
      'It costs S$4\u202f999 a month.',
    ],
  ])('replaces a price with %s', (_label, text) => {
    expect(guardSentence(text, EN).guard).toBe('price');
  });

  it('keeps a range with a non-breaking hyphen between official amounts', () => {
    expect(
      guardSentence('It costs S$15,000\u201135,000.', EN).guard,
    ).toBeNull();
  });

  it('shows and stores the cleaned text', () => {
    expect(guardSentence('Zen\u200betlabs ｗorks.', EN).text).toBe(
      'Zenetlabs works.',
    );
  });
});

describe('the natural ways to write a price', () => {
  it.each([
    ['4,999 Singapore dollars', EN],
    ['4,999 dollars', EN],
    ['dollars 4,999', EN],
    ['about 4.999 euros', EN],
    ['4.999 euros', EN],
    ['euros 4.999', EN],
    ['4.999 dólares de Singapur', ES],
    ['4.999 dólares', ES],
    ['4.999 US dollars', ES],
    ['S$4,999', ES],
  ])('replaces "%s"', (text, config) => {
    expect(guardSentence(`It is ${text}.`, config).guard).toBe('price');
  });

  it('keeps an official amount in words', () => {
    expect(
      guardSentence('It is 3,000 Singapore dollars.', EN).guard,
    ).toBeNull();
    expect(guardSentence('Son 3.000 euros.', ES).guard).toBeNull();
  });

  it('sees a currency sign at the end of the previous sentence', () => {
    expect(
      guardSentence('4,999 a month.', { ...EN, previous: 'It costs S$\n' })
        .guard,
    ).toBe('price');
    expect(guardSentence('4,999 a month.', EN).guard).toBeNull();
    expect(
      guardSentence('3,000 a month.', { ...EN, previous: 'It costs S$' }).guard,
    ).toBeNull();
  });

  it('does not count a number carried in from the previous sentence', () => {
    expect(
      guardSentence('Fine.', { ...EN, previous: 'S$999. ' }).guard,
    ).toBeNull();
  });
});

describe('links and domains', () => {
  it.each([
    'evil.xyz',
    'example.museum',
    'EVIL.TECH',
    'xn--80ak6aa92e.com',
    'shop.evil.io/pay',
    'bit.ly/abc',
  ])('removes %s', (name) => {
    const result = guardSentence(`Visit ${name} now.`, EN);
    expect(result.guard).toBe('link');
    expect(result.text).toBe('Visit now.');
  });

  it.each(['Node.js', 'Next.js', 'e.g. a shop', 'i.e. a shop'])(
    'keeps %s',
    (text) => {
      expect(guardSentence(`We use ${text}.`, EN).guard).toBeNull();
    },
  );
});
