import type { LandingMeta } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import type { PageId } from '@/lib/page-registry';
import { contentHead } from '@/lib/pages';
import type { jsonLd } from '@/lib/seo';

type Context = { context: { locale: Locale } };
type Match<Data> = {
  match: { context: { locale: Locale } };
  loaderData?: Data;
};

export function contentRouteOptions<
  Data extends { copy: { meta: LandingMeta } },
>(
  page: PageId,
  load: (locale: Locale) => Promise<Data>,
  structuredData: (locale: Locale, data: Data) => ReturnType<typeof jsonLd>[],
) {
  return {
    staticData: { page },
    loader: ({ context }: Context) => load(context.locale),
    head: ({ match, loaderData }: Match<Data>) =>
      loaderData
        ? contentHead(match.context.locale, page, loaderData.copy.meta)
        : {},
    scripts: ({ match, loaderData }: Match<Data>) =>
      loaderData ? structuredData(match.context.locale, loaderData) : [],
  };
}
