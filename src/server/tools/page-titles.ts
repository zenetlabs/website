import type { Locale } from '@/lib/i18n';
import { metaOf, serviceBodies } from '@/lib/llms';
import { hasLocale, PAGE_IDS, type PageId } from '@/lib/page-registry';
import { memoAsync } from '@/server/memo-async';

// The title of every page the locale has, built once per isolate.
export const pageTitles = memoAsync(
  async (locale: Locale): Promise<ReadonlyMap<PageId, string>> => {
    const bodies = await serviceBodies(locale);
    return new Map(
      PAGE_IDS.filter((page) => hasLocale(page, locale)).map((page) => [
        page,
        metaOf(locale, page, bodies).title,
      ]),
    );
  },
);
