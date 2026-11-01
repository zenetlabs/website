import type { Locale, messages } from '@/lib/i18n';
import {
  isPublished,
  type PageId,
  pagePath,
  type SiteFlags,
} from '@/lib/page-registry';
import { SITE } from '@/lib/site';

type NavTarget = { page: PageId; section?: string };
type NavLabel = keyof (typeof messages)['en']['nav'];

export const NAV = [
  { id: 'services', target: { page: 'services' } },
  { id: 'pricing', target: { page: 'pricing' } },
  { id: 'cases', target: { page: 'home', section: 'cases' } },
  { id: 'about', target: { page: 'about' } },
] as const satisfies readonly { id: NavLabel; target: NavTarget }[];

export function ctaTarget(site: SiteFlags): NavTarget {
  return isPublished('book', site)
    ? { page: 'book' }
    : { page: 'home', section: 'contact' };
}

export const CTA_TARGET: NavTarget = ctaTarget(SITE);

export function navHref(locale: Locale, target: NavTarget): string {
  const path = pagePath(locale, target.page);
  return target.section ? `${path}#${target.section}` : path;
}

export function isCurrent(
  target: NavTarget,
  page: PageId | undefined,
): boolean {
  return target.section === undefined && target.page === page;
}
