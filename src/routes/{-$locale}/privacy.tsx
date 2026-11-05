import { createFileRoute } from '@tanstack/react-router';
import { Suspense, use } from 'react';
import { loadLegalMeta } from '@/content/load';
import { legalEntity } from '@/lib/content';
import { type Locale, useLocale } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';
import { loadedPrivacyPage, loadPrivacyPage } from './-legal/privacy-page';

export const Route = createFileRoute('/{-$locale}/privacy')({
  staticData: { page: 'privacy' },
  loader: async ({ context }) => {
    const [meta] = await Promise.all([
      loadLegalMeta(context.locale),
      loadPrivacyPage(context.locale),
    ]);
    return meta;
  },
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'privacy', loaderData.privacy)
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
  return (
    <Suspense fallback={null}>
      <PrivacyBody locale={locale} title={privacy.title} />
    </Suspense>
  );
}

function PrivacyBody({ locale, title }: { locale: Locale; title: string }) {
  const Page = loadedPrivacyPage(locale) ?? use(loadPrivacyPage(locale));
  return <Page title={title} entity={legalEntity(locale)} />;
}
