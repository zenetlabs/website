import { expect, test } from '@playwright/test';
import {
  faqVisibilityProblems,
  identityProblems,
  jsonLdBlocks,
  validateJsonLd,
} from '../test/json-ld';
import { PLACEHOLDER } from '../test/placeholders';
import { parseSitemap } from '../test/sitemap';
import { htmlLang, LLMS_PATHS, markdownPathOf, PAGES, tagsOf } from './helpers';

const LASTMOD = /^\d{4}-\d{2}-\d{2}$/;

function decoded(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

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
  const linksByPage = new Map<string, Set<string>>();
  const idsByPage = new Map<string, Set<string>>();
  const fragmentLinks: { from: string; path: string; fragment: string }[] = [];

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

      const twin = tags.filter(
        (tag) => tag.rel === 'alternate' && tag.type === 'text/markdown',
      );
      expect(twin.map((tag) => tag.href)).toEqual([
        new URL(markdownPathOf(path), entry.loc).href,
      ]);
      const markdown = await request.get(markdownPathOf(path), {
        maxRedirects: 0,
      });
      expect(markdown.status()).toBe(200);
      expect(markdown.headers()['content-type']).toContain('text/markdown');
      expect(markdown.headers().link).toBe(`<${entry.loc}>; rel="canonical"`);
      expect(await markdown.text()).not.toMatch(PLACEHOLDER);

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

      idsByPage.set(
        path,
        new Set(
          [...html.matchAll(/\sid="([^"]+)"/g)].flatMap(([, id]) => id ?? []),
        ),
      );
      const links = new Set<string>();
      for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
        if (!href || !/^[/#](?!\/)/.test(href)) continue;
        const [location = '', fragment = ''] = href.split('#');
        const target = location || path;
        if (fragment) {
          fragmentLinks.push({
            from: path,
            path: target.split('?')[0] ?? target,
            fragment,
          });
        }
        if (!href.startsWith('#')) {
          internalLinks.add(target);
          links.add(target);
        }
      }
      linksByPage.set(path, links);
    });
  }

  await test.step('one @id keeps one identity on every page', () => {
    expect(identityProblems(blocksByPage)).toEqual([]);
  });

  await test.step('every page but the homes is linked from another page', () => {
    const linked = new Set(
      [...linksByPage].flatMap(([from, hrefs]) =>
        [...hrefs].filter((href) => href !== from),
      ),
    );
    const orphans = entries
      .map((entry) => new URL(entry.loc).pathname)
      .filter((path) => path !== '/' && path !== '/es')
      .filter((path) => !linked.has(path));
    expect(orphans).toEqual([]);
  });

  await test.step('every linked fragment exists on its target page', () => {
    expect(fragmentLinks.length).toBeGreaterThan(0);
    const unknownPages = new Set<string>();
    const missingIds: string[] = [];
    for (const { from, path, fragment } of fragmentLinks) {
      const ids = idsByPage.get(path);
      if (!ids) {
        unknownPages.add(path);
      } else if (!ids.has(decoded(fragment))) {
        missingIds.push(`${from} -> ${path}#${fragment}`);
      }
    }
    expect([...unknownPages], 'fragment targets outside the sitemap').toEqual(
      [],
    );
    expect(missingIds, 'fragments without a matching id').toEqual([]);
  });

  await test.step('internal links answer 200 without a redirect', async () => {
    for (const href of internalLinks) {
      const response = await request.get(href, { maxRedirects: 0 });
      expect(response.status(), href).toBe(200);
    }
  });
});

test('agent files link only to live urls', async ({ request, baseURL }) => {
  const host = new URL(baseURL ?? '').host;
  const targets = new Set<string>();
  for (const file of LLMS_PATHS) {
    const body = await (await request.get(file)).text();
    const links = [...body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].flatMap(
      ([, href]) => href ?? [],
    );
    expect(links.length, file).toBeGreaterThan(10);
    for (const link of links) {
      const url = new URL(link);
      if (url.host === host) targets.add(url.pathname);
    }
  }
  expect(targets.size).toBeGreaterThan(10);
  for (const path of targets) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    if (path.endsWith('.md')) {
      expect(response.headers()['content-type']).toContain('text/markdown');
    }
  }
});

test('error pages and llms files carry no placeholder', async ({ request }) => {
  for (const path of ['/nope', '/es/nope', ...LLMS_PATHS]) {
    const body = await (await request.get(path)).text();
    expect(body, path).not.toMatch(PLACEHOLDER);
  }
});
