import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';
import { PAGE_PATHS, pageHeadFor } from '@/lib/pages';
import { jsonLd, type pageHead, pageUrl } from '@/lib/seo';

const SITE = 'https://zenetlabs.com';
const OG_LOCALE = { en: 'en_US', es: 'es_ES' } as const;

type Meta = ReturnType<typeof pageHead>['meta'];

const cases = locales.flatMap((locale) =>
  PAGE_PATHS.map((path) => [locale, path] as const),
);

function contents(meta: Meta, key: 'name' | 'property', value: string) {
  return meta.flatMap((entry) => {
    if (key === 'name' && 'name' in entry && entry.name === value) {
      return [entry.content];
    }
    if (key === 'property' && 'property' in entry && entry.property === value) {
      return [entry.content];
    }
    return [];
  });
}

describe.each(cases)('pageHeadFor(%s, %s)', (locale, path) => {
  const head = pageHeadFor(locale, path);
  const url = pageUrl(locale, path);

  it('has one title, one description and index robots', () => {
    expect(head.meta.filter((entry) => 'title' in entry)).toHaveLength(1);
    expect(contents(head.meta, 'name', 'description')).toHaveLength(1);
    expect(contents(head.meta, 'name', 'robots')).toEqual(['index, follow']);
  });

  it('has exactly one self canonical', () => {
    const canonicals = head.links.filter((link) => link.rel === 'canonical');
    expect(canonicals).toEqual([{ rel: 'canonical', href: url }]);
  });

  it('has hreflang en, es and x-default pointing at en', () => {
    const alternates = head.links
      .filter((link) => link.rel === 'alternate')
      .map((link) => [link.hrefLang, link.href]);
    expect(alternates).toEqual([
      ['en', pageUrl('en', path)],
      ['es', pageUrl('es', path)],
      ['x-default', pageUrl('en', path)],
    ]);
  });

  it('has matching open graph locale, url and image', () => {
    expect(contents(head.meta, 'property', 'og:locale')).toEqual([
      OG_LOCALE[locale],
    ]);
    expect(contents(head.meta, 'property', 'og:url')).toEqual([url]);
    expect(contents(head.meta, 'property', 'og:image')).toEqual([
      `${SITE}/og.png`,
    ]);
  });

  it('is deterministic', () => {
    expect(pageHeadFor(locale, path)).toEqual(head);
  });
});

describe('pageUrl', () => {
  it('keeps the default locale unprefixed', () => {
    expect(pageUrl('en', '/')).toBe(`${SITE}/`);
    expect(pageUrl('es', '/')).toBe(`${SITE}/es`);
    expect(pageUrl('es', '/privacy-policy')).toBe(`${SITE}/es/privacy-policy`);
  });
});

describe('jsonLd', () => {
  it('escapes the less-than sign', () => {
    const entry = jsonLd({ name: '</script><b>' });
    expect(entry.type).toBe('application/ld+json');
    expect(entry.children).not.toContain('<');
    expect(JSON.parse(entry.children)).toEqual({ name: '</script><b>' });
  });
});
