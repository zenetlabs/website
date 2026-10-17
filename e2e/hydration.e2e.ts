import { expect, test } from '@playwright/test';
import { gotoHydrated, PAGES } from './helpers';

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

test('the language switch keeps the path', async ({ page }) => {
  await gotoHydrated(page, '/privacy-policy');
  await page
    .getByRole('navigation', { name: 'Language' })
    .first()
    .getByRole('link', { name: 'ES' })
    .click();
  await expect(page).toHaveURL(/\/es\/privacy-policy$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
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
