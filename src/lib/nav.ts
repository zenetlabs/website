import type { Locale, messages } from '@/lib/i18n';
import { type PageId, pagePath } from '@/lib/page-registry';

type NavTarget = { page: PageId; section?: string };
type NavLabel = keyof (typeof messages)['en']['nav'];

export const NAV = [
  { id: 'services', target: { page: 'services' } },
  { id: 'pricing', target: { page: 'pricing' } },
  { id: 'cases', target: { page: 'home', section: 'cases' } },
  { id: 'about', target: { page: 'about' } },
] as const satisfies readonly { id: NavLabel; target: NavTarget }[];

export const CTA_TARGET = {
  page: 'home',
  section: 'contact',
} as const satisfies NavTarget;

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
