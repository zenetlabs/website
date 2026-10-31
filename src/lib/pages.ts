import { legalNotice } from '@/content/es/legal-notice';
import { type Locale, messages } from '@/lib/i18n';
import type { PageId } from '@/lib/page-registry';
import { pageHead } from '@/lib/seo';

export type StaticPageId = Extract<PageId, 'home' | 'legalNotice'>;

export function pageCopy(
  locale: Locale,
  page: StaticPageId,
): { title: string; description: string } {
  if (page === 'home') return messages[locale].meta;
  return {
    title: legalNotice.metaTitle,
    description: legalNotice.description,
  };
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
