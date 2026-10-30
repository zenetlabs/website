import { expect, test } from '@playwright/test';
import { decodeEntities } from '../src/lib/markdown';
import { ogImagePath } from '../src/lib/og-image';
import { PATH_CASES } from '../test/redirect-cases';
import {
  CLUSTERS,
  gotoHydrated,
  htmlLang,
  PAGES,
  type Tag,
  tagsOf,
} from './helpers';

const OG_LOCALES = { en: 'en_SG', es: 'es_ES' } as const;

for (const cluster of CLUSTERS) {
  for (const locale of ['en', 'es'] as const) {
    const url = cluster[locale];
    if (url === undefined) continue;

    test(`${url} has lang, canonical and hreflang`, async ({ page }) => {
      await gotoHydrated(page, url);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('title')).toHaveCount(1);

      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveCount(1);
      expect(
        new URL((await canonical.getAttribute('href')) ?? '').pathname,
      ).toBe(url);

      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) =>
          links.map((link) => [
            link.getAttribute('hreflang'),
            new URL(link.getAttribute('href') ?? '').pathname,
          ]),
        );
      expect(alternates).toEqual([
        ...(cluster.en === undefined ? [] : [['en', cluster.en]]),
        ...(cluster.es === undefined ? [] : [['es', cluster.es]]),
        ...(cluster.en === undefined ? [] : [['x-default', cluster.en]]),
      ]);
      await expect(
        page.locator('meta[property="og:locale:alternate"]'),
      ).toHaveCount(
        cluster.en !== undefined && cluster.es !== undefined ? 1 : 0,
      );
    });

    test(`${url} has the same head in the SSR html and after hydration`, async ({
      page,
      request,
    }) => {
      const ssr = await (await request.get(url)).text();
      await gotoHydrated(page, url);
      const hydrated = await page.evaluate(() => document.head.innerHTML);

      const relevant = (tag: Tag) =>
        tag.rel === 'canonical' ||
        (tag.rel === 'alternate' && 'hreflang' in tag) ||
        tag.name === 'description' ||
        tag.name === 'robots' ||
        tag.name?.startsWith('twitter:') ||
        tag.property?.startsWith('og:');
      const key = (tag: Tag) => JSON.stringify(Object.entries(tag).sort());
      expect(tagsOf(hydrated).filter(relevant).map(key).sort()).toEqual(
        tagsOf(ssr).filter(relevant).map(key).sort(),
      );
      expect(htmlLang(ssr)).toBe(locale);
      expect(
        decodeEntities(ssr.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
      ).toBe(await page.title());
    });

    test(`${url} has per-locale open graph tags and a real image`, async ({
      page,
      request,
    }) => {
      await gotoHydrated(page, url);
      const og = (property: string) =>
        page.locator(`meta[property="${property}"]`).getAttribute('content');
      expect(await og('og:locale')).toBe(OG_LOCALES[locale]);
      const image = (await og('og:image')) ?? '';
      expect(new URL(image).pathname).toBe(ogImagePath(locale));
      const response = await request.get(new URL(image).pathname);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
    });
  }
}

test('the home and its Spanish twin load one stylesheet', async ({
  request,
}) => {
  for (const path of ['/', '/es']) {
    const html = await (await request.get(path)).text();
    const sheets = tagsOf(html).filter((tag) => tag.rel === 'stylesheet');
    expect(sheets, path).toHaveLength(1);
  }
});

test('unknown paths answer 404', async ({ request }) => {
  for (const path of ['/nope', '/fr', '/fr/privacy', '/es/nope']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

const NOT_FOUND: ReadonlyArray<readonly [string, string]> = [
  ['/nope', 'Page not found | Zenet Labs'],
  ['/es/nope', 'Página no encontrada | Zenet Labs'],
  ['/fr/privacy', 'Page not found | Zenet Labs'],
];

for (const [path, title] of NOT_FOUND) {
  test(`${path} has a 404 head without a canonical`, async ({ page }) => {
    await gotoHydrated(page, path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex',
    );
    for (const landmark of ['header', 'main', 'footer']) {
      await expect(page.locator(landmark)).toHaveCount(1);
    }
  });
}

test('404s send X-Robots-Tag noindex and 200 pages do not', async ({
  request,
}) => {
  for (const [path] of NOT_FOUND) {
    const response = await request.get(path);
    expect(response.headers()['x-robots-tag'], path).toBe('noindex');
  }
  for (const path of PAGES) {
    const response = await request.get(path);
    expect(response.headers()['x-robots-tag'], path).toBeUndefined();
  }
});

test('404 markdown starts with the title and the heading only', async ({
  request,
}) => {
  for (const [path, title] of NOT_FOUND.slice(0, 2)) {
    const response = await request.get(path, {
      headers: { accept: 'text/markdown' },
    });
    const heading = title.split(' | ')[0];
    const body = await response.text();
    expect(body.startsWith(`---\ntitle: "${title}"\n`), path).toBe(true);
    expect(body, path).toContain(`\n---\n\n# ${heading}\n`);
  }
});

for (const [from, to] of PATH_CASES) {
  test(`${from} redirects once to ${to}`, async ({ request, baseURL }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(`${baseURL}${to}`);
    expect(response.headers()['cache-control']).toBe('max-age=3600');
  });
}

test('robots and sitemap are served', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Disallow: /_serverFn/');
});

test('llms.txt is served as plain text', async ({ request }) => {
  const response = await request.get('/llms.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).toMatch(/^# Zenet Labs\n\n> /);
});

test('page HTML preloads only the hero serif fonts', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const preloads = (html.match(/<link[^>]*>/g) ?? []).filter((tag) =>
    tag.includes('rel="preload"'),
  );
  expect(preloads).toHaveLength(2);
  expect(preloads.filter((tag) => !tag.includes('instrument-serif'))).toEqual(
    [],
  );
});
