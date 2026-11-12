import { createFileRoute } from '@tanstack/react-router';
import { loadLegalNotice } from '@/content/load';
import { legalEntity } from '@/lib/content';
import { useLocale } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';
import { LegalNoticeEs } from './-legal/legal-notice-es';

export const Route = createFileRoute('/{-$locale}/legal-notice')({
  staticData: { page: 'legalNotice' },
  loader: loadLegalNotice,
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'legalNotice', loaderData)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? breadcrumbStructuredData(
          match.context.locale,
          'legalNotice',
          loaderData.title,
        )
      : [],
  component: LegalNotice,
});

function LegalNotice() {
  const { title } = Route.useLoaderData();
  return <LegalNoticeEs title={title} entity={legalEntity(useLocale())} />;
}
