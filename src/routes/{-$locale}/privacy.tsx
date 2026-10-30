import { createFileRoute } from '@tanstack/react-router';
import { legalEntity } from '@/lib/content';
import { useLocale, useMessages } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { pageHeadFor } from '@/lib/pages';
import { PrivacyEn } from './-legal/privacy-en';
import { PrivacyEs } from './-legal/privacy-es';

export const Route = createFileRoute('/{-$locale}/privacy')({
  staticData: { page: 'privacy' },
  head: ({ match }) => pageHeadFor(match.context.locale, 'privacy'),
  scripts: ({ match }) =>
    breadcrumbStructuredData(match.context.locale, 'privacy'),
  component: Privacy,
});

function Privacy() {
  const { privacy } = useMessages();
  const locale = useLocale();
  const Page = locale === 'es' ? PrivacyEs : PrivacyEn;
  return <Page title={privacy.title} entity={legalEntity(locale)} />;
}
