import type { Page } from '@playwright/test';

export const PAGES = [
  '/',
  '/es',
  '/privacy-policy',
  '/es/privacy-policy',
  '/cookies-policy',
  '/es/cookies-policy',
] as const;

export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForSelector('body[data-hydrated="true"]');
}

export async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    ),
  );
}
