import { createFileRoute } from '@tanstack/react-router';
import { useLocale, useMessages } from '@/lib/i18n';
import { pageHeadFor } from '@/lib/pages';
import { CookiesEn } from './-legal/cookies-en';
import { CookiesEs } from './-legal/cookies-es';

export const Route = createFileRoute('/{-$locale}/cookies-policy')({
  head: ({ match }) => pageHeadFor(match.context.locale, '/cookies-policy'),
  component: CookiesPolicy,
});

function CookiesPolicy() {
  const { cookies } = useMessages();
  const Page = useLocale() === 'es' ? CookiesEs : CookiesEn;
  return <Page title={cookies.title} />;
}
