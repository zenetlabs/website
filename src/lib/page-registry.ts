import type { LocationRewrite } from '@tanstack/react-router';
import { defaultLocale, type Locale, localePath, locales } from '@/lib/i18n';

export const PAGE_IDS = ['home', 'privacy', 'cookies'] as const;
export type PageId = (typeof PAGE_IDS)[number];

type PageEntry = { slugs: Record<Locale, string>; lastmod: string };

export const PAGES: Record<PageId, PageEntry> = {
  home: { slugs: { en: '/', es: '/' }, lastmod: '2026-10-30' },
  privacy: {
    slugs: { en: '/privacy', es: '/privacidad' },
    lastmod: '2026-10-30',
  },
  cookies: { slugs: { en: '/cookies', es: '/cookies' }, lastmod: '2026-10-30' },
};

export function pagePath(locale: Locale, page: PageId): string {
  return localePath(locale, PAGES[page].slugs[locale]);
}

const pageBySlug = new Map<string, PageId>();
for (const page of PAGE_IDS) {
  for (const slug of Object.values(PAGES[page].slugs)) {
    if (!pageBySlug.has(slug)) pageBySlug.set(slug, page);
  }
}

export function pageForSlug(slug: string): PageId | undefined {
  return pageBySlug.get(slug);
}

const publicToInternal = new Map<string, string>();
const internalToPublic = new Map<string, string>();
for (const locale of locales) {
  if (locale === defaultLocale) continue;
  for (const page of PAGE_IDS) {
    const external = pagePath(locale, page);
    const internal = localePath(locale, PAGES[page].slugs[defaultLocale]);
    if (external === internal) continue;
    publicToInternal.set(external, internal);
    internalToPublic.set(internal, external);
  }
}

function swapSlug(url: URL, swaps: Map<string, string>): URL | undefined {
  const pathname = swaps.get(url.pathname);
  if (pathname === undefined) return undefined;
  const next = new URL(url);
  next.pathname = pathname;
  return next;
}

export const localizedRewrite: LocationRewrite = {
  input: ({ url }) => swapSlug(url, publicToInternal),
  output: ({ url }) => swapSlug(url, internalToPublic),
};
