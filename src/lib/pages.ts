import { type Locale, messages } from '@/lib/i18n';
import type { PageId } from '@/lib/page-registry';
import { pageHead } from '@/lib/seo';

export type StaticPageId = Extract<PageId, 'home'>;

export function pageCopy(
  locale: Locale,
  page: StaticPageId,
): { title: string; description: string } {
  const copy: Record<StaticPageId, { title: string; description: string }> = {
    home: messages[locale].meta,
  };
  return copy[page];
}

export function legalMetaKey(
  page: 'privacy' | 'cookies',
  analytics: boolean = __GA4_ID__ !== null,
): 'privacy' | 'cookies' | 'cookiesAnalytics' {
  return page === 'cookies' && analytics ? 'cookiesAnalytics' : page;
}

export function pageHeadFor(locale: Locale, page: StaticPageId) {
  return pageHead({ locale, page, ...pageCopy(locale, page) });
}

export function contentMeta({
  metaTitle,
  description,
}: {
  metaTitle: string;
  description: string;
}): { title: string; description: string } {
  return { title: metaTitle, description };
}

export function contentHead(
  locale: Locale,
  page: PageId,
  meta: { metaTitle: string; description: string },
) {
  return pageHead({ locale, page, ...contentMeta(meta) });
}
