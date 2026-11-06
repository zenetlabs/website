import type { Locale, messages } from '@/lib/i18n';
import {
  isPublished,
  type PageId,
  pagePath,
  type SiteFlags,
} from '@/lib/page-registry';
import { SITE } from '@/lib/site';

type NavTarget = { page: PageId };
type NavLabel = keyof (typeof messages)['en']['nav'];

export const NAV = [
  { id: 'services', target: { page: 'services' } },
  { id: 'pricing', target: { page: 'pricing' } },
  { id: 'cases', target: { page: 'cases' } },
  { id: 'about', target: { page: 'about' } },
] as const satisfies readonly { id: NavLabel; target: NavTarget }[];

export function ctaTarget(site: SiteFlags): NavTarget {
  return isPublished('book', site) ? { page: 'book' } : { page: 'contact' };
}

export const CTA_TARGET: NavTarget = ctaTarget(SITE);

export function navHref(locale: Locale, target: NavTarget): string {
  return pagePath(locale, target.page);
}

export function isCurrent(
  target: NavTarget,
  page: PageId | undefined,
): boolean {
  return target.page === page;
}

// The contact page with a question already in its message field: the home
// desk without JavaScript or while the assistant is dark, and every fallback
// that must not lose what the visitor typed. The same encoding a GET form
// uses, so the router reads it back unchanged.
export function contactWithMessage(locale: Locale, message: string): string {
  const query = new URLSearchParams({ message }).toString();
  return `${navHref(locale, { page: 'contact' })}?${query}`;
}
