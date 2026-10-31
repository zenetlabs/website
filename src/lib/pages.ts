import { legalNotice } from '@/content/es/legal-notice';
import { type Locale, messages } from '@/lib/i18n';
import type { PageId, ServicePageId } from '@/lib/page-registry';
import { pageHead, SITE_NAME } from '@/lib/seo';

export type StaticPageId = Exclude<PageId, ServicePageId | 'services'>;

function pageMeta(
  locale: Locale,
  page: StaticPageId,
): { name: string; title: string; description: string } {
  const copy = messages[locale];
  switch (page) {
    case 'home':
      return { name: SITE_NAME, ...copy.meta };
    case 'pricing':
      return {
        name: copy.pricing.title,
        title: copy.pricing.metaTitle,
        description: copy.pricing.description,
      };
    case 'about':
      return {
        name: copy.about.title,
        title: copy.about.metaTitle,
        description: copy.about.description,
      };
    case 'privacy':
      return {
        name: copy.privacy.title,
        title: copy.privacy.metaTitle,
        description: copy.privacy.description,
      };
    case 'cookies':
      return {
        name: copy.cookies.title,
        title: copy.cookies.metaTitle,
        description: copy.cookies.description,
      };
    case 'legalNotice':
      return {
        name: legalNotice.title,
        title: legalNotice.metaTitle,
        description: legalNotice.description,
      };
  }
}

export function pageCopy(
  locale: Locale,
  page: StaticPageId,
): { title: string; description: string } {
  const { title, description } = pageMeta(locale, page);
  return { title, description };
}

export function pageName(locale: Locale, page: StaticPageId): string {
  return pageMeta(locale, page).name;
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
  page: ServicePageId | 'services',
  meta: { metaTitle: string; description: string },
) {
  return pageHead({ locale, page, ...contentMeta(meta) });
}
