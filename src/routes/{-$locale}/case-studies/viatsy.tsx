import { createFileRoute } from '@tanstack/react-router';
import { CaseStudyPage } from '@/components/case-study-page';
import { loadCaseContent } from '@/content/load';
import { contentRouteOptions } from '@/lib/content-route';
import { PAGES } from '@/lib/page-registry';
import { caseStructuredData } from '@/lib/page-structured-data';

export const Route = createFileRoute('/{-$locale}/case-studies/viatsy')({
  ...contentRouteOptions(
    'viatsyCase',
    loadCaseContent,
    (locale, { copy, hub }) => caseStructuredData(locale, copy, hub),
  ),
  component: ViatsyCase,
});

function ViatsyCase() {
  const { locale } = Route.useRouteContext();
  const data = Route.useLoaderData();
  return (
    <CaseStudyPage
      locale={locale}
      lastmod={PAGES.viatsyCase.lastmod}
      {...data}
    />
  );
}
