import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';
import {
  PAGE_IDS,
  PAGES,
  type PageId,
  pageForSlug,
  pagePath,
  localizedRewrite as rewrite,
} from '@/lib/page-registry';

const SLUG = /^\/([a-z0-9-]+(\/[a-z0-9-]+)*)?$/;
const ORIGIN = 'https://zenetlabs.com';

function run(direction: 'input' | 'output', path: string): string {
  const url = new URL(`${ORIGIN}${path}`);
  const result = rewrite[direction]?.({ url });
  return result instanceof URL ? result.pathname + result.search : path;
}

describe('PAGES', () => {
  const entries = PAGE_IDS.flatMap((page) =>
    locales.map((locale) => [page, locale, PAGES[page].slugs[locale]] as const),
  );

  it.each(entries)('%s (%s) slug %s is well-formed', (_page, _locale, slug) => {
    expect(slug).toMatch(SLUG);
  });

  it.each(locales)('slugs are unique within %s', (locale) => {
    const slugs = PAGE_IDS.map((page) => PAGES[page].slugs[locale]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('never shares a slug between two different pages', () => {
    const owners = new Map<string, PageId>();
    for (const page of PAGE_IDS) {
      for (const locale of locales) {
        const slug = PAGES[page].slugs[locale];
        expect(owners.get(slug) ?? page, slug).toBe(page);
        owners.set(slug, page);
      }
    }
  });

  it('resolves every slug back to its page', () => {
    for (const page of PAGE_IDS) {
      for (const locale of locales) {
        expect(pageForSlug(PAGES[page].slugs[locale])).toBe(page);
      }
    }
  });

  it.each(PAGE_IDS)('%s has a YYYY-MM-DD lastmod', (page) => {
    expect(PAGES[page].lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('pagePath', () => {
  it.each([
    ['en', 'home', '/'],
    ['en', 'privacy', '/privacy'],
    ['en', 'cookies', '/cookies'],
    ['es', 'home', '/es'],
    ['es', 'privacy', '/es/privacidad'],
    ['es', 'cookies', '/es/cookies'],
  ] as const)('%s %s is %s', (locale, page, expected) => {
    expect(pagePath(locale, page)).toBe(expected);
  });
});

describe('localizedRewrite', () => {
  const publicPaths = PAGE_IDS.flatMap((page) =>
    locales.map((locale) => pagePath(locale, page)),
  );

  it.each(publicPaths)(
    'the output of the input of %s is the same url',
    (path) => {
      expect(run('output', run('input', path))).toBe(path);
    },
  );

  it('maps the Spanish slug to the English route and back', () => {
    expect(run('input', '/es/privacidad')).toBe('/es/privacy');
    expect(run('output', '/es/privacy')).toBe('/es/privacidad');
  });

  it('keeps the query', () => {
    expect(run('input', '/es/privacidad?x=1')).toBe('/es/privacy?x=1');
    expect(run('output', '/es/privacy?x=1')).toBe('/es/privacidad?x=1');
  });

  it.each([
    '/',
    '/privacy',
    '/cookies',
    '/es',
    '/es/cookies',
    '/robots.txt',
    '/_serverFn/x',
    '/es/nope',
    '/privacidad',
  ])('passes %s through untouched', (path) => {
    expect(run('input', path)).toBe(path);
    expect(run('output', path)).toBe(path);
  });
});
