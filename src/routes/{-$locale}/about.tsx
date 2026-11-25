import { createFileRoute } from '@tanstack/react-router';
import { FounderPortrait } from '@/components/companies-strip';
import { CompanySheet } from '@/components/company-sheet';
import { DeskClose } from '@/components/desk-close';
import { Ledger } from '@/components/ledger';
import { HeroActions, PageHero } from '@/components/page-hero';
import { RichText } from '@/components/rich-text';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { PROSE } from '@/components/ui';
import {
  loadAboutContent,
  loadDeskClose,
  loadServicesHubContent,
} from '@/content/load';
import { CONTENT } from '@/lib/content';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

const TINT = sectionFrame('tint');

export const Route = createFileRoute('/{-$locale}/about')({
  staticData: { page: 'about' },
  loader: async ({ context }) => {
    const [about, { hub }, close] = await Promise.all([
      loadAboutContent(context.locale),
      loadServicesHubContent(context.locale),
      loadDeskClose(context.locale),
    ]);
    return { ...about, mail: hub.labels.mail, close };
  },
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'about', loaderData.page.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? breadcrumbStructuredData(
          match.context.locale,
          'about',
          loaderData.page.meta.title,
        )
      : [],
  component: About,
});

function About() {
  const { locale } = Route.useRouteContext();
  const { page, companies, mail, close } = Route.useLoaderData();
  const { founder } = CONTENT[locale];
  const stories = page.story.map((paragraph) => (
    <p key={paragraph.id}>
      <RichText parts={paragraph.parts} />
    </p>
  ));

  return (
    <>
      <PageHero
        title={page.title}
        lead={page.lead}
        actions={
          <HeroActions
            locale={locale}
            button={page.cta.button}
            secondary={{ label: page.companies.cases, page: 'cases' }}
          />
        }
        stage={
          <CompanySheet
            title={page.companies.title}
            lead={page.companies.lead}
            companies={companies}
          />
        }
      />
      <StickyZone locale={locale}>
        <section
          id="founder"
          aria-labelledby="founder-title"
          data-ground="paper"
        >
          <Container className="founder-block">
            <FounderPortrait founder={founder} className="founder-portrait" />
            <div>
              <h2 id="founder-title">{founder.name}</h2>
              <p className="mt-2 text-ui-l text-human">{founder.role}</p>
              <div className={`mt-6 grid gap-4 text-lg ${PROSE}`}>
                {stories.slice(0, 1)}
              </div>
            </div>
            <div className={`grid content-start gap-4 text-lg ${PROSE}`}>
              {stories.slice(1)}
            </div>
          </Container>
        </section>
        <section
          aria-labelledby="principles-title"
          data-ground={TINT.ground}
          className={TINT.bg}
        >
          <Container className={TINT.pad}>
            <h2 id="principles-title">{page.principles.title}</h2>
            <div className="mt-6 md:mt-12">
              <Ledger items={page.principles.items} locale={locale} />
            </div>
          </Container>
        </section>
        <section aria-labelledby="vision-title" data-ground="paper">
          <Container className="py-section">
            <h2 id="vision-title">{page.vision.title}</h2>
            <p className="vision-text">{page.vision.text}</p>
          </Container>
        </section>
      </StickyZone>
      <DeskClose cta={page.cta} mail={mail} {...close} locale={locale} />
    </>
  );
}
