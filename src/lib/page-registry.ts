import type { LocationRewrite } from '@tanstack/react-router';
import type { ServiceId } from '@/content/types';
import { defaultLocale, type Locale, localePath, locales } from '@/lib/i18n';

export const PAGE_IDS = [
  'home',
  'services',
  'automation',
  'integrations',
  'agents',
  'software',
  'training',
  'holdedPrestashop',
  'holdedWoocommerce',
  'holdedHubspot',
  'verifactu',
  'travelAgencies',
  'viatsyCase',
  'pricing',
  'about',
  'privacy',
  'cookies',
  'legalNotice',
] as const;
export type PageId = (typeof PAGE_IDS)[number];
export type ServicePageId = Extract<
  PageId,
  'automation' | 'integrations' | 'agents' | 'software' | 'training'
>;

export const HOLDED_PAGE_IDS = [
  'holdedPrestashop',
  'holdedWoocommerce',
  'holdedHubspot',
] as const satisfies readonly PageId[];
export type HoldedPageId = (typeof HOLDED_PAGE_IDS)[number];
export const LANDING_PAGE_IDS = [
  ...HOLDED_PAGE_IDS,
  'verifactu',
  'travelAgencies',
] as const satisfies readonly PageId[];
export type LandingPageId = (typeof LANDING_PAGE_IDS)[number];

type Slugs = Partial<Record<Locale, string>>;

type BaseEntry = { lastmod: string; parent?: PageId } & (
  | { slugs: Slugs & { en: string }; route?: string }
  | { slugs: Slugs & { en?: undefined }; route: string }
);

export type PageEntry = BaseEntry & { kind?: 'service'; service?: ServiceId };
type StaticPageEntry = BaseEntry & { kind?: never; service?: never };
type ServicePageEntry = BaseEntry & {
  kind: 'service';
  parent: PageId;
  service: ServiceId;
};
type LandingPageEntry = BaseEntry & { kind?: never; service: ServiceId };

export const PAGES: Record<
  Exclude<PageId, ServicePageId | LandingPageId>,
  StaticPageEntry
> &
  Record<ServicePageId, ServicePageEntry> &
  Record<LandingPageId, LandingPageEntry> = {
  home: { slugs: { en: '/', es: '/' }, lastmod: '2026-10-31' },
  services: {
    slugs: { en: '/services', es: '/servicios' },
    lastmod: '2026-10-31',
  },
  automation: {
    slugs: {
      en: '/services/ai-automation',
      es: '/servicios/automatizacion-de-procesos',
    },
    kind: 'service',
    parent: 'services',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  integrations: {
    slugs: {
      en: '/services/integrations',
      es: '/servicios/integraciones',
    },
    kind: 'service',
    parent: 'services',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  agents: {
    slugs: { en: '/services/ai-agents', es: '/servicios/agentes-de-ia' },
    kind: 'service',
    parent: 'services',
    service: 'agent',
    lastmod: '2026-10-31',
  },
  software: {
    slugs: {
      en: '/services/custom-software',
      es: '/servicios/desarrollo-de-software-a-medida',
    },
    kind: 'service',
    parent: 'services',
    service: 'web',
    lastmod: '2026-10-31',
  },
  training: {
    slugs: {
      en: '/services/ai-training',
      es: '/servicios/formacion-ia-equipos',
    },
    kind: 'service',
    parent: 'services',
    service: 'training',
    lastmod: '2026-10-31',
  },
  holdedPrestashop: {
    slugs: { es: '/servicios/integraciones/holded-prestashop' },
    route: '/services/integrations/holded-prestashop',
    parent: 'integrations',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  holdedWoocommerce: {
    slugs: { es: '/servicios/integraciones/holded-woocommerce' },
    route: '/services/integrations/holded-woocommerce',
    parent: 'integrations',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  holdedHubspot: {
    slugs: { es: '/servicios/integraciones/holded-hubspot' },
    route: '/services/integrations/holded-hubspot',
    parent: 'integrations',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  verifactu: {
    slugs: { es: '/verifactu-integracion' },
    route: '/verifactu',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  travelAgencies: {
    slugs: { es: '/sectores/agencias-de-viaje' },
    route: '/industries/travel-agencies',
    service: 'integration',
    lastmod: '2026-10-31',
  },
  viatsyCase: {
    slugs: { en: '/case-studies/viatsy', es: '/casos/viatsy' },
    lastmod: '2026-10-31',
  },
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

export function isHoldedPage(page: PageId): page is HoldedPageId {
  return HOLDED_PAGE_IDS.some((id) => id === page);
}

export function isLandingPage(page: PageId): page is LandingPageId {
  return LANDING_PAGE_IDS.some((id) => id === page);
}

export function isServicePage(page: PageId): page is ServicePageId {
  return PAGES[page].kind === 'service';
}

export const SERVICE_PAGE_IDS: readonly ServicePageId[] =
  PAGE_IDS.filter(isServicePage);

export function serviceOf(page: ServicePageId | LandingPageId): ServiceId {
  return PAGES[page].service;
}

export function pagesForService(id: ServiceId): ServicePageId[] {
  return SERVICE_PAGE_IDS.filter((page) => serviceOf(page) === id);
}

export function breadcrumbTrail(page: PageId): PageId[] {
  if (page === 'home') return ['home'];
  return [...breadcrumbTrail(PAGES[page].parent ?? 'home'), page];
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

export function serviceHref(locale: Locale, id: ServiceId): string {
  const [first] = pagesForService(id);
  return first
    ? pagePath(locale, first)
    : `${pagePath(locale, 'pricing')}#${id}`;
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
  if (page && hasLocale(page, target))
    return `${pagePath(target, page)}${search}`;
  const parent = page ? PAGES[page].parent : undefined;
  return pagePath(
    target,
    parent && hasLocale(parent, target) ? parent : 'home',
  );
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
