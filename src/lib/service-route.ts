import { loadServicePageContent } from '@/content/load';
import type { Locale } from '@/lib/i18n';
import type { ServicePageId } from '@/lib/page-registry';
import { serviceStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

type Loaded = Awaited<ReturnType<typeof loadServicePageContent>>;
type Match = { match: { context: { locale: Locale } }; loaderData?: Loaded };

export function serviceRouteOptions(page: ServicePageId) {
  return {
    staticData: { page },
    loader: ({ context }: { context: { locale: Locale } }) =>
      loadServicePageContent(context.locale, page),
    head: ({ match, loaderData }: Match) =>
      loaderData
        ? contentHead(match.context.locale, page, loaderData.copy.meta)
        : {},
    scripts: ({ match, loaderData }: Match) =>
      loaderData
        ? serviceStructuredData(
            match.context.locale,
            page,
            loaderData.copy,
            loaderData.hub,
            loaderData.services,
          )
        : [],
  };
}
