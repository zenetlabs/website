import { createFileRoute } from '@tanstack/react-router';
import { Cases } from '@/components/cases';
import { CompaniesStrip } from '@/components/companies-strip';
import { CtaSection } from '@/components/cta-section';
import { PageIntro } from '@/components/page-intro';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { loadCasesHubContent } from '@/content/load';
import { casesStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

const TINT = sectionFrame('tint');

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
      <section data-ground={TINT.ground} className={TINT.bg}>
        <Container className="pt-8 pb-10 md:pt-14 md:pb-16">
          <PageIntro title={page.title} lead={page.lead} />
        </Container>
      </section>
      <StickyZone locale={locale}>
        <Cases copy={page.cases} locale={locale} />
        <CompaniesStrip copy={page.companies} locale={locale} />
      </StickyZone>
      <CtaSection cta="cases" copy={page.cta} locale={locale} />
    </>
  );
}
