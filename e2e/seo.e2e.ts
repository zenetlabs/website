import { expect, test } from '@playwright/test';
import { decodeEntities } from '../src/lib/markdown';
import { ogImagePath } from '../src/lib/og-image';
import { PATH_CASES } from '../test/redirect-cases';
import { parseSitemap } from '../test/sitemap';
import {
  CLUSTERS,
  gotoHydrated,
  htmlLang,
  markdownPathOf,
  PAGES,
  PAIRS,
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

    test(`${url} links its markdown twin`, async ({ page }) => {
      await gotoHydrated(page, url);
      const twin = page.locator('link[rel="alternate"][type="text/markdown"]');
      await expect(twin).toHaveCount(1);
      await expect(twin).not.toHaveAttribute('hreflang', /.*/);
      expect(new URL((await twin.getAttribute('href')) ?? '').pathname).toBe(
        markdownPathOf(url),
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
        tag.type === 'text/markdown' ||
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
  for (const path of [
    '/nope',
    '/fr',
    '/fr/privacy',
    '/es/nope',
    '/services/nope',
    '/es/servicios/nope',
    '/case-studies/nope',
    '/es/casos/nope',
    '/industries',
    '/es/sectores',
    '/es/servicios/integraciones/nope',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

const NOT_FOUND: ReadonlyArray<readonly [string, string]> = [
  ['/nope', 'Page not found | Zenet Labs'],
  ['/es/nope', 'Página no encontrada | Zenet Labs'],
  ['/fr/privacy', 'Page not found | Zenet Labs'],
  ['/services/nope', 'Page not found | Zenet Labs'],
  ['/es/servicios/nope', 'Página no encontrada | Zenet Labs'],
  ['/es/servicios/integraciones/nope', 'Página no encontrada | Zenet Labs'],
  ['/case-studies/nope', 'Page not found | Zenet Labs'],
  ['/es/casos/nope', 'Página no encontrada | Zenet Labs'],
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
  const text = await robots.text();
  expect(text).toContain('Disallow: /_serverFn/');
  expect(text).toContain('Disallow: /internal/');
});

test('page HTML preloads the one face, once', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const preloads = (html.match(/<link[^>]*>/g) ?? []).filter(
    (tag) => tag.includes('rel="preload"') && tag.includes('as="font"'),
  );
  expect(preloads).toHaveLength(1);
  expect(preloads[0]).toContain('schibsted-grotesk-latin-wght-normal');
  expect(preloads[0]).toContain('crossorigin="anonymous"');
});

test('every page renders a distinct title', async ({ request }) => {
  const titles = new Map<string, string>();
  for (const path of PAIRS.flatMap(({ en, es }) => [en, es])) {
    const html = await (await request.get(path)).text();
    const title = decodeEntities(
      html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '',
    );
    expect(title, path).not.toBe('');
    expect(
      titles.get(title),
      `${path} repeats the title of ${titles.get(title)}`,
    ).toBeUndefined();
    titles.set(title, path);
  }
  expect(titles.size).toBe(PAIRS.length * 2);
});

const TITLE_LENGTH = [30, 60] as const;
const DESCRIPTION_LENGTH = [120, 160] as const;

function headingLevels(html: string): number[] {
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? '';
  return [...main.matchAll(/<h([1-6])\b/g)].map(([, level]) => Number(level));
}

test('every sitemap url passes the technical SEO audit', async ({
  request,
}) => {
  const entries = parseSitemap(
    await (await request.get('/sitemap.xml')).text(),
  );
  expect(entries.length).toBeGreaterThan(30);
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const entry of entries) {
    await test.step(entry.loc, async () => {
      const path = new URL(entry.loc).pathname;
      const html = await (await request.get(path)).text();
      const tags = tagsOf(html);
      const meta = (name: string) =>
        tags.find((tag) => tag.name === name || tag.property === name)
          ?.content ?? '';

      const title = decodeEntities(
        html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '',
      );
      expect(title.length, `title of ${path}`).toBeGreaterThanOrEqual(
        TITLE_LENGTH[0],
      );
      expect(title.length, `title of ${path}`).toBeLessThanOrEqual(
        TITLE_LENGTH[1],
      );
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      titles.add(title);

      const description = meta('description');
      expect(
        description.length,
        `description of ${path}`,
      ).toBeGreaterThanOrEqual(DESCRIPTION_LENGTH[0]);
      expect(description.length, `description of ${path}`).toBeLessThanOrEqual(
        DESCRIPTION_LENGTH[1],
      );
      expect(descriptions.has(description), `duplicate ${path}`).toBe(false);
      descriptions.add(description);

      const canonical = tags.filter((tag) => tag.rel === 'canonical');
      expect(canonical.map((tag) => tag.href)).toEqual([entry.loc]);
      expect(entry.loc).not.toMatch(/[?#]/);

      const hreflangs = tags.flatMap((tag) =>
        tag.rel === 'alternate' && tag.hreflang ? [tag.hreflang] : [],
      );
      expect(hreflangs.includes('x-default'), `x-default on ${path}`).toBe(
        hreflangs.includes('en'),
      );
      if (!hreflangs.includes('en')) {
        expect(hreflangs, `${path} is es-only`).toEqual(['es']);
      }
      expect(htmlLang(html)).toBe(path.startsWith('/es') ? 'es' : 'en');

      const levels = headingLevels(html);
      expect(levels.filter((level) => level === 1)).toHaveLength(1);
      expect(levels[0]).toBe(1);
      levels.forEach((level, index) => {
        if (index > 0) {
          expect(level, `heading order in ${path}`).toBeLessThanOrEqual(
            (levels[index - 1] ?? 0) + 1,
          );
        }
      });

      expect(meta('og:title')).toBe(title);
      expect(meta('og:description')).toBe(description);
      expect(meta('og:url')).toBe(entry.loc);
      expect(meta('og:image:width')).toBe('1200');
      expect(meta('og:image:height')).toBe('630');
      expect(meta('twitter:card')).toBe('summary_large_image');
      const image = await request.get(new URL(meta('og:image')).pathname);
      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toBe('image/png');
    });
  }
});

test('the og images are 1200 by 630', async ({ request }) => {
  for (const locale of ['en', 'es'] as const) {
    const png = await (await request.get(ogImagePath(locale))).body();
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }
});
