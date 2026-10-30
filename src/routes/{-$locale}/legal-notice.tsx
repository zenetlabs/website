import { createFileRoute } from '@tanstack/react-router';
import { legalNotice } from '@/content/es/legal-notice';
import { legalEntity } from '@/lib/content';
import { useLocale } from '@/lib/i18n';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { pageHeadFor } from '@/lib/pages';
import { LegalNoticeEs } from './-legal/legal-notice-es';

export const Route = createFileRoute('/{-$locale}/legal-notice')({
  staticData: { page: 'legalNotice' },
  head: ({ match }) => pageHeadFor(match.context.locale, 'legalNotice'),
  scripts: ({ match }) =>
    breadcrumbStructuredData(match.context.locale, 'legalNotice'),
  component: LegalNotice,
});

function LegalNotice() {
  return (
    <LegalNoticeEs
      title={legalNotice.title}
      entity={legalEntity(useLocale())}
    />
  );
}
