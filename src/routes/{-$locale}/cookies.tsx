import { createFileRoute } from '@tanstack/react-router';
import { loadLegalMeta } from '@/content/load';
import { legalEntity } from '@/lib/content';
import { useLocale } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';
import { CookiesEn } from './-legal/cookies-en';
import { CookiesEs } from './-legal/cookies-es';

export const Route = createFileRoute('/{-$locale}/cookies')({
  staticData: { page: 'cookies' },
  loader: ({ context }) => loadLegalMeta(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'cookies', loaderData.cookies)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? breadcrumbStructuredData(
          match.context.locale,
          'cookies',
          loaderData.cookies.title,
        )
      : [],
  component: Cookies,
});

function Cookies() {
  const { cookies } = Route.useLoaderData();
  const locale = useLocale();
  const Page = locale === 'es' ? CookiesEs : CookiesEn;
  return <Page title={cookies.title} entity={legalEntity(locale)} />;
}
