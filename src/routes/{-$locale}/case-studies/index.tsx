import { createFileRoute } from '@tanstack/react-router';
import { Cases } from '@/components/cases';
import { CtaSection } from '@/components/cta-section';
import { Container, EmphasisTitle } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { LEAD } from '@/components/ui';
import { loadCasesHubContent } from '@/content/load';
import { casesStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/case-studies/')({
  staticData: { page: 'cases' },
  loader: ({ context }) => loadCasesHubContent(context.locale),
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'cases', loaderData.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData ? casesStructuredData(match.context.locale, loaderData) : [],
  component: CasesHub,
});

function CasesHub() {
  const { locale } = Route.useRouteContext();
  const page = Route.useLoaderData();

  return (
    <>
      <section data-ground="paper">
        <Container className="py-12 md:py-24">
          <h1 className="max-w-4xl">
            <EmphasisTitle parts={page.title} />
          </h1>
          <p className={`mt-6 ${LEAD}`}>{page.lead}</p>
        </Container>
      </section>
      <StickyZone locale={locale}>
        <Cases copy={page.cases} locale={locale} />
      </StickyZone>
      <CtaSection cta="cases" copy={page.cta} locale={locale} />
    </>
  );
}
