import { expect, test } from '@playwright/test';
import { gotoHydrated } from './helpers';

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

const LEGACY: ReadonlyArray<readonly [string, string]> = [
  ['/blog/x', '/'],
  ['/es/blog', '/es'],
  ['/privacy', '/privacy-policy'],
  ['/es/cookies', '/es/cookies-policy'],
  ['/about-us', '/'],
  ['/en', '/'],
  ['/en/cookies-policy', '/cookies-policy'],
  ['/privacy?x=1', '/privacy-policy?x=1'],
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

test('page HTML preloads only the hero serif fonts', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const preloads = [...html.matchAll(/rel="preload"[^>]*href="([^"]+)"/g)].map(
    (m) => m[1],
  );
  expect(preloads).toHaveLength(2);
  expect(preloads.every((href) => href.includes('instrument-serif'))).toBe(
    true,
  );
});
