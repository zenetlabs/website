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
