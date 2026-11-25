import { createFileRoute } from '@tanstack/react-router';
import { Cases } from '@/components/cases';
import { CompanySheet } from '@/components/company-sheet';
import { DeskClose } from '@/components/desk-close';
import { PageIntroSection } from '@/components/page-intro';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import {
  loadCasesHubContent,
  loadDeskClose,
  loadServicesHubContent,
} from '@/content/load';
import { casesStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

const TINT = sectionFrame('tint');

export const Route = createFileRoute('/{-$locale}/case-studies/')({
  staticData: { page: 'cases' },
  loader: async ({ context }) => {
    const [page, { hub }, close] = await Promise.all([
      loadCasesHubContent(context.locale),
      loadServicesHubContent(context.locale),
      loadDeskClose(context.locale),
    ]);
    return { page, mail: hub.labels.mail, close };
  },
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'cases', loaderData.page.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? casesStructuredData(match.context.locale, loaderData.page)
      : [],
  component: CasesHub,
});

function CasesHub() {
  const { locale } = Route.useRouteContext();
  const { page, mail, close } = Route.useLoaderData();

  return (
    <>
      <PageIntroSection title={page.title} lead={page.lead} />
      <StickyZone locale={locale}>
        <Cases copy={page.cases} intro={page.intro} locale={locale} />
        <section
          aria-labelledby="companies-title"
          data-ground={TINT.ground}
          className={TINT.bg}
        >
          <Container className="py-section-compact">
            <CompanySheet
              title={page.companies.title}
              companies={page.companies.items}
            />
          </Container>
        </section>
      </StickyZone>
      <DeskClose cta={page.cta} mail={mail} {...close} locale={locale} />
    </>
  );
}
