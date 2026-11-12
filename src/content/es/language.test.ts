import { describe, expect, it } from 'vitest';
import es from '@/i18n/es.json';

const modules = import.meta.glob<Record<string, unknown>>(
  ['./**/*.ts', '!./**/*.test.ts'],
  { eager: true },
);

// Whole words that never belong in Spanish copy.
const STOPLIST = [
  'the',
  'and',
  'your',
  'you',
  'with',
  'our',
  'please',
  'click',
  'here',
  'booking',
  'settings',
  'free',
  'call',
  'send',
  'from',
  'this',
  'that',
  'will',
];

// Names kept in English on the Spanish site that contain a stopword.
const ALLOWED = [
  'Accounting and Corporate Regulatory Authority',
  'Booking.com',
];

const STOPWORD = new RegExp(
  `(?<![\\p{L}\\p{N}])(${STOPLIST.join('|')})(?![\\p{L}\\p{N}])`,
  'iu',
);

// Ids and codes (`booking`, `from`, `call`) are not copy.
const ID = /^[a-z0-9_-]+$/;

type Found = { path: string; text: string };

function strings(value: unknown, path: string): Found[] {
  if (typeof value === 'string')
    return ID.test(value) ? [] : [{ path, text: value }];
  if (Array.isArray(value))
    return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value !== null && typeof value === 'object')
    return Object.entries(value).flatMap(([key, item]) =>
      strings(item, `${path}.${key}`),
    );
  return [];
}

// Placeholders, code spans and URLs are not copy.
function prose(text: string): string {
  const stripped = text
    .replaceAll(/\{[^}]*\}/g, ' ')
    .replaceAll(/`[^`]*`/g, ' ')
    .replaceAll(/https?:\/\/\S+/g, ' ');
  return ALLOWED.reduce((rest, name) => rest.replaceAll(name, ' '), stripped);
}

function englishIn(found: readonly Found[]): string[] {
  return found.flatMap(({ path, text }) => {
    const word = STOPWORD.exec(prose(text))?.[1];
    return word ? [`${path}: "${word}" in ${JSON.stringify(text)}`] : [];
  });
}

const spanish = [
  ...Object.entries(modules).flatMap(([file, exports]) =>
    strings(exports, file),
  ),
  ...strings(es, 'i18n/es.json'),
];

describe('Spanish copy', () => {
  it('walks every module under src/content/es and the es catalogue', () => {
    expect(Object.keys(modules)).toContain('./home.ts');
    expect(Object.keys(modules)).toContain('./holded-pairs/holded-hubspot.ts');
    expect(spanish.length).toBeGreaterThan(1000);
  });

  it('has no English stopword in any string', () => {
    expect(englishIn(spanish)).toEqual([]);
  });

  it('catches a planted English string and lets an allowed name through', () => {
    expect(
      englishIn([
        { path: 'planted', text: 'Click here to confirm your booking' },
        {
          path: 'name',
          text: 'Inscrita en la Accounting and Corporate Regulatory Authority',
        },
      ]),
    ).toEqual(['planted: "Click" in "Click here to confirm your booking"']);
  });
});
