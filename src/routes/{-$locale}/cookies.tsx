import { createFileRoute } from '@tanstack/react-router';
import { legalEntity } from '@/lib/content';
import { useLocale, useMessages } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { pageHeadFor } from '@/lib/pages';
import { CookiesEn } from './-legal/cookies-en';
import { CookiesEs } from './-legal/cookies-es';

export const Route = createFileRoute('/{-$locale}/cookies')({
  staticData: { page: 'cookies' },
  head: ({ match }) => pageHeadFor(match.context.locale, 'cookies'),
  scripts: ({ match }) =>
    breadcrumbStructuredData(match.context.locale, 'cookies'),
  component: Cookies,
});

function Cookies() {
  const { cookies } = useMessages();
  const locale = useLocale();
  const Page = locale === 'es' ? CookiesEs : CookiesEn;
  return <Page title={cookies.title} entity={legalEntity(locale)} />;
}
