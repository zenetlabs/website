import { expect, test } from '@playwright/test';
import {
  faqVisibilityProblems,
  identityProblems,
  jsonLdBlocks,
  validateJsonLd,
} from '../test/json-ld';
import { PLACEHOLDER } from '../test/placeholders';
import { parseSitemap } from '../test/sitemap';
import { htmlLang, PAGES, tagsOf } from './helpers';

const LASTMOD = /^\d{4}-\d{2}-\d{2}$/;

test('every sitemap url is a self-canonical, indexable, reciprocal page', async ({
  request,
}) => {
  const entries = parseSitemap(
    await (await request.get('/sitemap.xml')).text(),
  );
  expect(entries).toHaveLength(PAGES.length);
  const locs = new Set(entries.map((entry) => entry.loc));
  const internalLinks = new Set<string>();
  const blocksByPage = new Map<string, unknown[]>();

  for (const entry of entries) {
    await test.step(entry.loc, async () => {
      const path = new URL(entry.loc).pathname;
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(response.headers()['x-robots-tag']).toBeUndefined();
      const html = await response.text();
      const tags = tagsOf(html);

      const robots = tags.find((tag) => tag.name === 'robots');
      expect(robots?.content ?? '').not.toContain('noindex');
      const canonicals = tags.filter((tag) => tag.rel === 'canonical');
      expect(canonicals.map((tag) => tag.href)).toEqual([entry.loc]);

      const hreflangs = new Map(
        tags
          .filter((tag) => tag.rel === 'alternate' && tag.hreflang)
          .map((tag) => [tag.hreflang ?? '', tag.href ?? '']),
      );
      expect(hreflangs).toEqual(entry.alternates);
      expect(hreflangs.get(htmlLang(html))).toBe(entry.loc);
      expect(hreflangs.has('x-default')).toBe(hreflangs.has('en'));
      expect(hreflangs.get('x-default')).toBe(hreflangs.get('en'));

      expect(html).not.toMatch(PLACEHOLDER);
      const blocks = jsonLdBlocks(html);
      expect(blocks.length).toBeGreaterThan(0);
      expect(validateJsonLd(blocks, new URL(entry.loc).origin)).toEqual([]);
      expect(faqVisibilityProblems(html, blocks)).toEqual([]);
      blocksByPage.set(path, blocks);

      for (const target of hreflangs.values()) {
        expect(locs.has(target), target).toBe(true);
        const back = entries.find((other) => other.loc === target);
        expect([...(back?.alternates.values() ?? [])]).toContain(entry.loc);
      }

      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(entry.lastmod).toMatch(LASTMOD);

      for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
        if (!href || !/^\/(?!\/)/.test(href)) continue;
        internalLinks.add(href.split('#')[0] || '/');
      }
    });
  }

  await test.step('one @id keeps one identity on every page', () => {
    expect(identityProblems(blocksByPage)).toEqual([]);
  });

  await test.step('internal links answer 200 without a redirect', async () => {
    for (const href of internalLinks) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), href).toBe(200);
    }
  });
});

test('error pages and llms.txt carry no placeholder', async ({ request }) => {
  for (const path of ['/nope', '/es/nope', '/llms.txt']) {
    const body = await (await request.get(path)).text();
    expect(body, path).not.toMatch(PLACEHOLDER);
  }
});
