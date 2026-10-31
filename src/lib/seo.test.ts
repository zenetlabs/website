import { describe, expect, it } from 'vitest';
import { type Locale, locales } from '@/lib/i18n';
import { metaOf } from '@/lib/llms';
import { ogImagePath } from '@/lib/og-image';
import {
  hasLocale,
  type PageId,
  pageLocales,
  pagesIn,
} from '@/lib/page-registry';
import { jsonLd, markdownUrl, pageHead, pageUrl } from '@/lib/seo';
import { SERVICE_BODIES } from '../../test/service-bodies';

const SITE = 'https://zenetlabs.com';
const OG_LOCALE = { en: 'en_SG', es: 'es_ES' } as const;

type Meta = ReturnType<typeof pageHead>['meta'];

function pageHeadFor(locale: Locale, page: PageId) {
  return pageHead({
    locale,
    page,
    ...metaOf(locale, page, SERVICE_BODIES[locale]),
  });
}

const cases = locales.flatMap((locale) =>
  pagesIn(locale).map((page) => [locale, page] as const),
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

describe.each(cases)('pageHeadFor(%s, %s)', (locale, page) => {
  const head = pageHeadFor(locale, page);
  const url = pageUrl(locale, page);

  it('has one title, one description and index robots', () => {
    expect(head.meta.filter((entry) => 'title' in entry)).toHaveLength(1);
    expect(contents(head.meta, 'name', 'description')).toHaveLength(1);
    expect(contents(head.meta, 'name', 'robots')).toEqual(['index, follow']);
  });

  it('has exactly one self canonical', () => {
    const canonicals = head.links.filter((link) => link.rel === 'canonical');
    expect(canonicals).toEqual([{ rel: 'canonical', href: url }]);
  });

  it('has hreflang for the locales present, and x-default only with en', () => {
    const alternates = head.links
      .filter((link) => link.rel === 'alternate' && link.hrefLang)
      .map((link) => [link.hrefLang, link.href]);
    expect(alternates).toEqual([
      ...pageLocales(page).map((l) => [l, pageUrl(l, page)]),
      ...(hasLocale(page, 'en') ? [['x-default', pageUrl('en', page)]] : []),
    ]);
  });

  it('links its markdown twin after the hreflang alternates', () => {
    const alternates = head.links.filter((link) => link.rel === 'alternate');
    const markdown = alternates.filter((link) => link.type === 'text/markdown');
    expect(markdown).toEqual([
      {
        rel: 'alternate',
        type: 'text/markdown',
        href: markdownUrl(locale, page),
      },
    ]);
    expect(markdown[0]?.href.startsWith(`${SITE}/`)).toBe(true);
    expect(alternates.at(-1)).toBe(markdown[0]);
  });

  it('has matching open graph locale, url and image', () => {
    expect(contents(head.meta, 'property', 'og:locale')).toEqual([
      OG_LOCALE[locale],
    ]);
    expect(contents(head.meta, 'property', 'og:url')).toEqual([url]);
    expect(contents(head.meta, 'property', 'og:image')).toEqual([
      `${SITE}${ogImagePath(locale)}`,
    ]);
    expect(contents(head.meta, 'name', 'twitter:image')).toEqual([
      `${SITE}${ogImagePath(locale)}`,
    ]);
    expect(contents(head.meta, 'property', 'og:locale:alternate')).toEqual(
      pageLocales(page)
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l]),
    );
  });

  it('is deterministic', () => {
    expect(pageHeadFor(locale, page)).toEqual(head);
  });
});

describe('inner page descriptions', () => {
  const inner = cases.filter(([, page]) => page !== 'home');

  it.each(inner)('%s %s is 120 to 155 characters', (locale, page) => {
    const [description] = contents(
      pageHeadFor(locale, page).meta,
      'name',
      'description',
    );
    expect(description?.length).toBeGreaterThanOrEqual(120);
    expect(description?.length).toBeLessThanOrEqual(155);
  });
});

describe('single-locale pages', () => {
  const head = pageHeadFor('es', 'legalNotice');

  it('has only its own hreflang and no x-default or alternate og locale', () => {
    const alternates = head.links.filter(
      (link) => link.rel === 'alternate' && link.hrefLang,
    );
    expect(alternates.map((link) => link.hrefLang)).toEqual(['es']);
    expect(contents(head.meta, 'property', 'og:locale:alternate')).toEqual([]);
  });
});

describe('titles and descriptions', () => {
  const heads = cases.map(([locale, page]) => pageHeadFor(locale, page));
  const titles = heads.map((head) =>
    head.meta.flatMap((entry) => ('title' in entry ? [entry.title] : [])),
  );
  const descriptions = heads.map(
    (head) => contents(head.meta, 'name', 'description')[0] ?? '',
  );

  it('has a unique title of 30 to 60 characters per page and locale', () => {
    const flat = titles.flat();
    expect(flat).toHaveLength(cases.length);
    expect(new Set(flat).size).toBe(cases.length);
    for (const title of flat) {
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(60);
    }
  });

  it('has a unique description of 70 to 160 characters per page and locale', () => {
    expect(new Set(descriptions).size).toBe(cases.length);
    for (const description of descriptions) {
      expect(description.length).toBeGreaterThanOrEqual(70);
      expect(description.length).toBeLessThanOrEqual(160);
    }
  });
});

describe('pageUrl', () => {
  it.each([
    ['en', 'home', `${SITE}/`],
    ['en', 'pricing', `${SITE}/pricing`],
    ['en', 'about', `${SITE}/about`],
    ['en', 'privacy', `${SITE}/privacy`],
    ['en', 'cookies', `${SITE}/cookies`],
    ['es', 'home', `${SITE}/es`],
    ['es', 'pricing', `${SITE}/es/precios`],
    ['es', 'about', `${SITE}/es/sobre-nosotros`],
    ['es', 'privacy', `${SITE}/es/privacidad`],
    ['es', 'cookies', `${SITE}/es/cookies`],
    ['es', 'legalNotice', `${SITE}/es/aviso-legal`],
    ['en', 'legalNotice', `${SITE}/es/aviso-legal`],
  ] as const)('%s %s is %s', (locale, page, expected) => {
    expect(pageUrl(locale, page)).toBe(expected);
  });
});

describe('jsonLd', () => {
  it('escapes the less-than sign', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: '</script><b>',
    } as const;
    const entry = jsonLd(data);
    expect(entry.type).toBe('application/ld+json');
    expect(entry.children).not.toContain('<');
    expect(JSON.parse(entry.children)).toEqual(data);
  });
});
