import type { Page } from '@playwright/test';
import { decodeEntities, tidy } from '../src/lib/markdown';

export const PAIRS = [
  { en: '/', es: '/es' },
  { en: '/pricing', es: '/es/precios' },
  { en: '/about', es: '/es/sobre-nosotros' },
  { en: '/privacy', es: '/es/privacidad' },
  { en: '/cookies', es: '/es/cookies' },
] as const;

export const LOCALES = ['en', 'es'] as const;

export const LLMS_PATHS = [
  '/llms.txt',
  '/es/llms.txt',
  '/llms-full.txt',
  '/es/llms-full.txt',
] as const;

export const CLUSTERS: ReadonlyArray<{ en?: string; es?: string }> = [
  ...PAIRS,
  { es: '/es/aviso-legal' },
];

export const PAGES = CLUSTERS.flatMap((cluster) =>
  [cluster.en, cluster.es].flatMap((url) => url ?? []),
);

export function markdownPathOf(path: string): string {
  return path === '/' ? '/index.md' : `${path}.md`;
}

export function normalise(text: string): string {
  return tidy(text.replace(/\\([\\`*_[\]<>])/g, '$1'));
}

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
