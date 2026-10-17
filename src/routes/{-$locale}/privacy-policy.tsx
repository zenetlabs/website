import { createFileRoute } from '@tanstack/react-router';
import { useLocale, useMessages } from '@/lib/i18n';
import { pageHeadFor } from '@/lib/pages';
import { PrivacyEn } from './-legal/privacy-en';
import { PrivacyEs } from './-legal/privacy-es';

export const Route = createFileRoute('/{-$locale}/privacy-policy')({
  head: ({ match }) => pageHeadFor(match.context.locale, '/privacy-policy'),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  const { privacy } = useMessages();
  const Page = useLocale() === 'es' ? PrivacyEs : PrivacyEn;
  return <Page title={privacy.title} />;
}
