import type { Page } from '@playwright/test';
import { decodeEntities } from '../src/lib/markdown';

export const PAIRS = [
  { en: '/', es: '/es' },
  { en: '/privacy', es: '/es/privacidad' },
  { en: '/cookies', es: '/es/cookies' },
] as const;

export const PAGES = PAIRS.flatMap((pair) => [pair.en, pair.es]);

const TAG = /<(?:link|meta)\b[^>]*>/g;
const ATTRIBUTE = /([\w:-]+)="([^"]*)"/g;

export type Tag = Record<string, string>;

export function tagsOf(html: string): Tag[] {
  return (html.match(TAG) ?? []).map((tag) => {
    const attributes: Tag = {};
    for (const [, name, value] of tag.matchAll(ATTRIBUTE)) {
      if (name) attributes[name.toLowerCase()] = decodeEntities(value ?? '');
    }
    return attributes;
  });
}

export function htmlLang(html: string): string {
  return /<html[^>]*\blang="([^"]+)"/.exec(html)?.[1] ?? '';
}

export async function waitForHydration(page: Page) {
  await page.waitForSelector('body[data-hydrated="true"]');
}

export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await waitForHydration(page);
}

export async function settleAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((animation) => animation.finished),
    ),
  );
}
