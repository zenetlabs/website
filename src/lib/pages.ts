import { type Locale, messages } from '@/lib/i18n';
import { pageHead } from '@/lib/seo';

export const PAGE_PATHS = ['/', '/privacy-policy', '/cookies-policy'] as const;
export type PagePath = (typeof PAGE_PATHS)[number];

function pageCopy(
  locale: Locale,
  path: PagePath,
): { title: string; description: string } {
  const copy = messages[locale];
  switch (path) {
    case '/':
      return copy.meta;
    case '/privacy-policy':
      return {
        title: `${copy.privacy.title} | Zenet Labs`,
        description: copy.privacy.description,
      };
    case '/cookies-policy':
      return {
        title: `${copy.cookies.title} | Zenet Labs`,
        description: copy.cookies.description,
      };
  }
}

export function pageHeadFor(locale: Locale, path: PagePath) {
  return pageHead({ locale, path, ...pageCopy(locale, path) });
}
