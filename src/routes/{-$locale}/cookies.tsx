import { createFileRoute } from '@tanstack/react-router';
import { useLocale, useMessages } from '@/lib/i18n';
import { pageHeadFor } from '@/lib/pages';
import { CookiesEn } from './-legal/cookies-en';
import { CookiesEs } from './-legal/cookies-es';

export const Route = createFileRoute('/{-$locale}/cookies')({
  staticData: { page: 'cookies' },
  head: ({ match }) => pageHeadFor(match.context.locale, 'cookies'),
  component: Cookies,
});

function Cookies() {
  const { cookies } = useMessages();
  const Page = useLocale() === 'es' ? CookiesEs : CookiesEn;
  return <Page title={cookies.title} />;
}
