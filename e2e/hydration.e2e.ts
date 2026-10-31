import { expect, test } from '@playwright/test';
import {
  deferredScripts,
  gotoHydrated,
  HOLDED_PAGES,
  PAGES,
  PAIRS,
  SECTOR_PAGE,
  VERIFACTU_PAGE,
  waitForHydration,
} from './helpers';

for (const url of PAGES) {
  test(`${url} hydrates without errors`, async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (error) =>
      problems.push(`pageerror: ${error.message}`),
    );
    page.on('console', (message) => {
      if (message.type() === 'error')
        problems.push(`console: ${message.text()}`);
    });

    await gotoHydrated(page, url);
    await page.waitForLoadState('networkidle');

    expect(problems).toEqual([]);
  });
}

type Switch = readonly [
  from: string,
  label: 'ES' | 'EN',
  to: string,
  lang: string,
];

const SWITCHES: ReadonlyArray<Switch> = [
  ...PAIRS.flatMap((pair): Switch[] => [
    [pair.en, 'ES', pair.es, 'es'],
    [pair.es, 'EN', pair.en, 'en'],
  ]),
  ['/privacy?x=1', 'ES', '/es/privacidad?x=1', 'es'],
  ...HOLDED_PAGES.map(
    (path): Switch => [path, 'EN', '/services/integrations', 'en'],
  ),
  [VERIFACTU_PAGE, 'EN', '/', 'en'],
  [SECTOR_PAGE, 'EN', '/', 'en'],
  ['/es/aviso-legal', 'EN', '/', 'en'],
  ['/es/aviso-legal?x=1', 'EN', '/', 'en'],
  [
    '/es/servicios/integraciones/holded-hubspot?x=1',
    'EN',
    '/services/integrations',
    'en',
  ],
  ['/nope', 'ES', '/es', 'es'],
  ['/es/nope', 'EN', '/', 'en'],
];

for (const [from, label, to, lang] of SWITCHES) {
  test(`the language switch goes from ${from} to ${to}`, async ({ page }) => {
    await gotoHydrated(page, from);
    await page
      .getByRole('navigation', { name: 'Language' })
      .or(page.getByRole('navigation', { name: 'Idioma' }))
      .first()
      .getByRole('link', { name: label })
      .click();
    await expect(page).toHaveURL(to);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await waitForHydration(page);
  });
}

test('the header Services link opens the hub on every page type', async ({
  page,
}) => {
  for (const [path, services] of [
    ['/privacy', '/services'],
    ['/es/privacidad', '/es/servicios'],
    ['/services/ai-agents', '/services'],
    ['/es/servicios/agentes-de-ia', '/es/servicios'],
  ] as const) {
    await gotoHydrated(page, path);
    const hrefs = await page
      .getByRole('navigation', { name: /Main|Principal/ })
      .first()
      .getByRole('link')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs).toContain(services);
  }
});

test('hydration JS loads only after the first contentful paint', async ({
  page,
  request,
}) => {
  for (const path of ['/', '/es']) {
    const html = await (await request.get(path)).text();
    expect(html).not.toMatch(/<link[^>]*rel="modulepreload"/);
    expect(html).not.toMatch(/<script[^>]*type="module"[^>]*src=/);
    const deferred = deferredScripts(html);
    expect(deferred?.preloads.length).toBeGreaterThan(0);
    const entry = deferred?.entry ?? '';
    expect(deferred?.preloads).toContain(entry);

    await gotoHydrated(page, path);
    const timing = await page.evaluate((src) => {
      const url = new URL(src, location.href).href;
      return {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]
          ?.startTime,
        entry: performance.getEntriesByName(url)[0]?.startTime,
      };
    }, entry);
    expect(timing.fcp).toBeDefined();
    expect(timing.entry).toBeGreaterThan(timing.fcp ?? Infinity);
  }
});

test('non-HTML responses are untouched', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).not.toContain('requestAnimationFrame');
});
