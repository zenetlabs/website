import type { Locale } from '@/lib/i18n';
import {
  isPublished,
  type PageId,
  pagePath,
  pagesIn,
  type SiteFlags,
} from '@/lib/page-registry';

export const NAVIGATE_SECTIONS = [
  'services',
  'cases',
  'faq',
  'contact',
] as const;
export type NavigateSection = (typeof NAVIGATE_SECTIONS)[number];

export function resolveNavigation(
  input: { page: PageId; section?: NavigateSection | undefined },
  locale: Locale,
  site: SiteFlags,
): string | null {
  if (!isPublished(input.page, site)) return null;
  if (!pagesIn(locale, site).includes(input.page)) return null;
  const path = pagePath(locale, input.page);
  return input.page === 'home' && input.section
    ? `${path}#${input.section}`
    : path;
}
