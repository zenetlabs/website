import { createFileRoute } from '@tanstack/react-router';
import { loadLegalMeta } from '@/content/load';
import { legalEntity } from '@/lib/content';
import { useLocale } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { legalHead } from '@/lib/pages';
import { PrivacyEn } from './-legal/privacy-en';
import { PrivacyEs } from './-legal/privacy-es';

export const Route = createFileRoute('/{-$locale}/privacy')({
  staticData: { page: 'privacy' },
  loader: ({ context }) => loadLegalMeta(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? legalHead(match.context.locale, 'privacy', loaderData.privacy)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? breadcrumbStructuredData(
          match.context.locale,
          'privacy',
          loaderData.privacy.title,
        )
      : [],
  component: Privacy,
});

function Privacy() {
  const { privacy } = Route.useLoaderData();
  const locale = useLocale();
  const Page = locale === 'es' ? PrivacyEs : PrivacyEn;
  return <Page title={privacy.title} entity={legalEntity(locale)} />;
}
