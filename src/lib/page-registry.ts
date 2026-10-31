import type { LocationRewrite } from '@tanstack/react-router';
import { defaultLocale, type Locale, localePath, locales } from '@/lib/i18n';

export const PAGE_IDS = [
  'home',
  'pricing',
  'about',
  'privacy',
  'cookies',
  'legalNotice',
] as const;
export type PageId = (typeof PAGE_IDS)[number];

type Slugs = Partial<Record<Locale, string>>;

export type PageEntry = { lastmod: string } & (
  | { slugs: Slugs & { en: string }; route?: string }
  | { slugs: Slugs & { en?: undefined }; route: string }
);

export const PAGES: Record<PageId, PageEntry> = {
  home: { slugs: { en: '/', es: '/' }, lastmod: '2026-10-31' },
  pricing: {
    slugs: { en: '/pricing', es: '/precios' },
    lastmod: '2026-10-31',
  },
  about: {
    slugs: { en: '/about', es: '/sobre-nosotros' },
    lastmod: '2026-10-31',
  },
  privacy: {
    slugs: { en: '/privacy', es: '/privacidad' },
    lastmod: '2026-10-31',
  },
  cookies: {
    slugs: { en: '/cookies', es: '/cookies' },
    lastmod: '2026-10-31',
  },
  legalNotice: {
    slugs: { es: '/aviso-legal' },
    route: '/legal-notice',
    lastmod: '2026-10-31',
  },
};

function routeFor({ route, slugs }: PageEntry): string {
  return route ?? slugs.en ?? '/';
}

export function routeOf(page: PageId): string {
  return routeFor(PAGES[page]);
}

export function hasLocale(page: PageId, locale: Locale): boolean {
  return PAGES[page].slugs[locale] !== undefined;
}

export function pageLocales(page: PageId): Locale[] {
  return locales.filter((locale) => hasLocale(page, locale));
}

export function pagesIn(locale: Locale): PageId[] {
  return PAGE_IDS.filter((page) => hasLocale(page, locale));
}

export function slugForms(page: PageId): string[] {
  const { slugs } = PAGES[page];
  return [...locales.flatMap((locale) => slugs[locale] ?? []), routeOf(page)];
}

export function pagePath(locale: Locale, page: PageId): string {
  const { slugs } = PAGES[page];
  for (const candidate of [locale, ...locales]) {
    const slug = slugs[candidate];
    if (slug !== undefined) return localePath(candidate, slug);
  }
  return localePath(defaultLocale, routeOf(page));
}

export function markdownPath(locale: Locale, page: PageId): string {
  const path = pagePath(locale, page);
  return `${path === '/' ? '/index' : path}.md`;
}

export function switchHref(
  target: Locale,
  page: PageId | undefined,
  search: string,
): string {
  return page && hasLocale(page, target)
    ? `${pagePath(target, page)}${search}`
    : pagePath(target, 'home');
}

const pageBySlug = new Map<string, PageId>();
for (const page of PAGE_IDS) {
  for (const slug of slugForms(page)) {
    if (!pageBySlug.has(slug)) pageBySlug.set(slug, page);
  }
}

export function pageForSlug(slug: string): PageId | undefined {
  return pageBySlug.get(slug);
}

function swapSlug(url: URL, swaps: Map<string, string>): URL | undefined {
  const pathname = swaps.get(url.pathname);
  if (pathname === undefined) return undefined;
  const next = new URL(url);
  next.pathname = pathname;
  return next;
}

export function createRewrite(entries: readonly PageEntry[]): LocationRewrite {
  const publicToInternal = new Map<string, string>();
  const internalToPublic = new Map<string, string>();
  for (const locale of locales) {
    for (const entry of entries) {
      const slug = entry.slugs[locale];
      if (slug === undefined) continue;
      const external = localePath(locale, slug);
      const internal = localePath(locale, routeFor(entry));
      if (external === internal) continue;
      publicToInternal.set(external, internal);
      internalToPublic.set(internal, external);
    }
  }
  return {
    input: ({ url }) => swapSlug(url, publicToInternal),
    output: ({ url }) => swapSlug(url, internalToPublic),
  };
}

export const localizedRewrite = createRewrite(Object.values(PAGES));
