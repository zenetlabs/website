import { describe, expect, it } from 'vitest';
import { locales } from '@/lib/i18n';
import {
  hasLocale,
  PAGE_IDS,
  PAGES,
  pageLocales,
  pagesIn,
} from '@/lib/page-registry';
import { robotsTxt } from '@/lib/robots';
import { pageUrl } from '@/lib/seo';
import { SITEMAP_XML } from '@/lib/sitemap';
import { parseSitemap } from '../../test/sitemap';

describe('robotsTxt', () => {
  it('serves one group for every crawler on the canonical host', () => {
    expect(robotsTxt('zenetlabs.com')).toBe(
      [
        'User-agent: Googlebot',
        'User-agent: Bingbot',
        'User-agent: GPTBot',
        'User-agent: OAI-SearchBot',
        'User-agent: ChatGPT-User',
        'User-agent: ClaudeBot',
        'User-agent: Claude-SearchBot',
        'User-agent: PerplexityBot',
        'User-agent: Google-Extended',
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /_serverFn/',
        '',
        'Sitemap: https://zenetlabs.com/sitemap.xml',
        '',
      ].join('\n'),
    );
  });

  it.each([
    'rebuild-prod-zenet-web.zenetlabs.workers.dev',
    'www.zenetlabs.com',
    'localhost:4173',
  ])('disallows everything on %s', (host) => {
    expect(robotsTxt(host)).toBe('User-agent: *\nDisallow: /\n');
  });
});

describe('sitemapXml', () => {
  const xml = SITEMAP_XML;

  it('lists the pages present in each locale', () => {
    expect(parseSitemap(xml).map((entry) => entry.loc)).toEqual([
      'https://zenetlabs.com/',
      'https://zenetlabs.com/privacy',
      'https://zenetlabs.com/cookies',
      'https://zenetlabs.com/es',
      'https://zenetlabs.com/es/privacidad',
      'https://zenetlabs.com/es/cookies',
      'https://zenetlabs.com/es/aviso-legal',
    ]);
  });

  it('gives every url the registry lastmod', () => {
    expect(parseSitemap(xml).map((entry) => entry.lastmod)).toEqual(
      locales.flatMap((locale) =>
        pagesIn(locale).map((page) => PAGES[page].lastmod),
      ),
    );
  });

  it('gives every url its alternates', () => {
    const entries = parseSitemap(xml);
    expect(entries).toHaveLength(7);
    for (const { loc, alternates } of entries) {
      const page = PAGE_IDS.find((id) =>
        locales.some((locale) => pageUrl(locale, id) === loc),
      );
      expect(page).toBeDefined();
      if (!page) continue;
      expect([...alternates]).toEqual([
        ...pageLocales(page).map((l) => [l, pageUrl(l, page)]),
        ...(hasLocale(page, 'en') ? [['x-default', pageUrl('en', page)]] : []),
      ]);
    }
  });

  it('gives the single-locale page only its own alternate', () => {
    const entry = parseSitemap(xml).find((e) => e.loc.endsWith('/aviso-legal'));
    expect([...(entry?.alternates ?? [])]).toEqual([
      ['es', 'https://zenetlabs.com/es/aviso-legal'],
    ]);
  });

  it('is well-formed xml', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  });
});
