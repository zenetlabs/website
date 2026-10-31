import { expect, test } from '@playwright/test';
import { gotoHydrated, PAGES, PAIRS, waitForHydration } from './helpers';

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
  ['/es/aviso-legal', 'EN', '/', 'en'],
  ['/es/aviso-legal?x=1', 'EN', '/', 'en'],
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

test('JS is fetched at low priority', async ({ request }) => {
  for (const path of ['/', '/es']) {
    const html = await (await request.get(path)).text();
    const preloads = (html.match(/<link[^>]*>/g) ?? []).filter((tag) =>
      tag.includes('rel="modulepreload"'),
    );
    const scripts = (html.match(/<script[^>]*>/g) ?? []).filter(
      (tag) => tag.includes('type="module"') && tag.includes(' src='),
    );
    expect(preloads.length).toBeGreaterThan(0);
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of [...preloads, ...scripts]) {
      expect(tag).toContain('fetchpriority="low"');
    }
  }
});

test('non-HTML responses are untouched', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.headers()['content-type']).toContain('text/plain');
  expect(await response.text()).not.toContain('fetchpriority');
});
