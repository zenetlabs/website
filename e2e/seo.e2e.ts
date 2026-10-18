import { expect, test } from '@playwright/test';
import { gotoHydrated, PAGES } from './helpers';

const PATHS = ['/', '/privacy-policy', '/cookies-policy'] as const;

for (const locale of ['en', 'es'] as const) {
  for (const path of PATHS) {
    const es = path === '/' ? '/es' : `/es${path}`;
    const url = locale === 'en' ? path : es;

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
        ['en', path],
        ['es', es],
        ['x-default', path],
      ]);
    });
  }
}

test('unknown paths answer 404', async ({ request }) => {
  for (const path of ['/nope', '/fr', '/fr/privacy-policy']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

const NOT_FOUND: ReadonlyArray<readonly [string, string]> = [
  ['/nope', 'Page not found | Zenet Labs'],
  ['/es/nope', 'Página no encontrada | Zenet Labs'],
  ['/fr/privacy-policy', 'Page not found | Zenet Labs'],
];

for (const [path, title] of NOT_FOUND) {
  test(`${path} has a 404 head without a canonical`, async ({ page }) => {
    await gotoHydrated(page, path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
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

const LEGACY: ReadonlyArray<readonly [string, string]> = [
  ['/blog/x', '/'],
  ['/es/blog', '/es'],
  ['/privacy', '/privacy-policy'],
  ['/es/cookies', '/es/cookies-policy'],
  ['/about-us', '/'],
  ['/en', '/'],
  ['/en/cookies-policy', '/cookies-policy'],
  ['/privacy?x=1', '/privacy-policy?x=1'],
  ['/es/', '/es'],
  ['/privacy-policy/', '/privacy-policy'],
  ['/es/cookies-policy/?x=1', '/es/cookies-policy?x=1'],
];

for (const [from, to] of LEGACY) {
  test(`${from} redirects once to ${to}`, async ({ request, baseURL }) => {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(`${baseURL}${to}`);
  });
}

test('robots and sitemap are served', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(6);
  expect((await request.get('/robots.txt')).status()).toBe(200);
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
