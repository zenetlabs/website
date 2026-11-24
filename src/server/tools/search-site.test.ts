import { beforeAll, describe, expect, it } from 'vitest';
import type { Locale } from '@/lib/i18n';
import { buildLlmsFull } from '@/lib/llms';
import { pagesIn } from '@/lib/page-registry';
import { pageUrl } from '@/lib/seo';
import { SITE } from '@/lib/site';
import {
  type Passage,
  passagesOf,
  searchPassages,
} from '@/server/tools/search-site';

const passages: Record<Locale, Passage[]> = { en: [], es: [] };

beforeAll(async () => {
  for (const locale of ['en', 'es'] as const) {
    passages[locale] = passagesOf(await buildLlmsFull(locale), locale, SITE);
  }
});

const pagesOf = (locale: Locale, query: string) =>
  searchPassages(passages[locale], query).map((hit) => hit.page);

describe('passagesOf', () => {
  it.each(['en', 'es'] as const)(
    'maps every passage to a page of the %s site, and skips Pages and Optional',
    (locale) => {
      const known = new Set<string>(pagesIn(locale));
      expect(passages[locale].length).toBeGreaterThan(50);
      for (const passage of passages[locale]) {
        expect(known.has(passage.page), passage.heading).toBe(true);
        expect(passage.heading).not.toBe('Optional');
        expect(passage.text).not.toMatch(/\.md\)/);
      }
      expect(
        passages[locale].some((passage) =>
          /^(Pages|Páginas)$/.test(passage.heading),
        ),
      ).toBe(false);
    },
  );
});

describe('the llms-full layout the passages are read from', () => {
  it.each(['en', 'es'] as const)(
    'has a linked heading for every service page, in %s',
    async (locale) => {
      const text = await buildLlmsFull(locale);
      for (const page of ['diagnostic', 'integrations', 'agents'] as const) {
        expect(text, page).toContain(`](${pageUrl(locale, page)})`);
        const heading = text
          .split('\n')
          .find(
            (line) =>
              /^#{2,4} \[/.test(line) &&
              line.includes(`(${pageUrl(locale, page)})`),
          );
        expect(heading, page).toBeDefined();
      }
      expect(text).toMatch(/^## /m);
      expect(text).toMatch(/^### /m);
    },
  );

  it('files a linked heading under its page and a service FAQ under the service', () => {
    const found = passages.en.find(
      (passage) => passage.page === 'integrations',
    );
    expect(found).toBeDefined();
    const faq = passages.en.filter(
      (passage) => passage.page === 'agents' && passage.heading.endsWith('?'),
    );
    expect(faq.length).toBeGreaterThan(0);
  });

  it('drops the passages of a page that is not published', async () => {
    const lit = {
      ...SITE,
      calculator: { published: true },
    };
    const text = await buildLlmsFull('en', undefined, lit);
    expect(
      passagesOf(text, 'en', lit).some((p) => p.page === 'calculator'),
    ).toBe(true);
    const dark = passagesOf(text, 'en', {
      ...SITE,
      calculator: { published: false },
    });
    expect(dark.some((p) => p.page === 'calculator')).toBe(false);
    expect(dark.length).toBeGreaterThan(50);
  });
});

describe('searchPassages', () => {
  it('finds WhatsApp on the integrations page in English', () => {
    expect(pagesOf('en', 'whatsapp')).toContain('integrations');
  });

  it('finds Holded on the Holded pages in Spanish, and nowhere in English', () => {
    const found = pagesOf('es', 'holded');
    expect(found.length).toBeGreaterThan(0);
    expect(
      found.some((page) =>
        ['holdedPrestashop', 'holdedWoocommerce', 'holdedHubspot'].includes(
          page,
        ),
      ),
    ).toBe(true);
    expect(pagesOf('en', 'holded')).toEqual([]);
  });

  it('finds the Spanish diagnostic without the accent', () => {
    expect(pagesOf('es', 'diagnostico')).toContain('diagnostic');
  });

  it('returns at most five results, two per page, with short excerpts', () => {
    for (const locale of ['en', 'es'] as const) {
      for (const query of [
        'price',
        'integration',
        'agent',
        'faq data',
        'precio',
      ]) {
        const found = searchPassages(passages[locale], query);
        expect(found.length).toBeLessThanOrEqual(5);
        const perPage = new Map<string, number>();
        for (const { page, excerpt } of found) {
          perPage.set(page, (perPage.get(page) ?? 0) + 1);
          expect(excerpt.length).toBeLessThanOrEqual(200);
        }
        for (const count of perPage.values())
          expect(count).toBeLessThanOrEqual(2);
      }
    }
  });

  it('carries the currency of the locale and never the other', () => {
    const en = JSON.stringify(
      searchPassages(passages.en, 'diagnostic price cost'),
    );
    expect(en).toContain('S$');
    expect(en).not.toContain('€');
    const es = JSON.stringify(
      searchPassages(passages.es, 'diagnóstico precio'),
    );
    expect(es).toContain('€');
    expect(es).not.toContain('S$');
  });

  it('keeps ten answers under two thousand characters', () => {
    const queries = [
      'whatsapp',
      'xero',
      'price',
      'agent',
      'training',
      'cookies',
      'viatsy',
      'founder',
      'maintenance',
      'diagnostic',
    ];
    for (const query of queries) {
      expect(
        JSON.stringify(searchPassages(passages.en, query)).length,
        query,
      ).toBeLessThanOrEqual(2000);
    }
  });

  it('answers nothing for stopwords only', () => {
    expect(searchPassages(passages.en, 'what is the')).toEqual([]);
    expect(searchPassages(passages.es, 'qué es el')).toEqual([]);
  });
});
