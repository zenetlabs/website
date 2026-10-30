import { legalNotice } from '@/content/es/legal-notice';
import { type Locale, messages } from '@/lib/i18n';
import type { PageId } from '@/lib/page-registry';
import { pageHead } from '@/lib/seo';

export function pageCopy(
  locale: Locale,
  page: PageId,
): { title: string; description: string } {
  const copy = messages[locale];
  switch (page) {
    case 'home':
      return copy.meta;
    case 'privacy':
      return {
        title: copy.privacy.metaTitle,
        description: copy.privacy.description,
      };
    case 'cookies':
      return {
        title: copy.cookies.metaTitle,
        description: copy.cookies.description,
      };
    case 'legalNotice':
      return {
        title: legalNotice.metaTitle,
        description: legalNotice.description,
      };
  }
}

export function pageHeadFor(locale: Locale, page: PageId) {
  return pageHead({ locale, page, ...pageCopy(locale, page) });
}
