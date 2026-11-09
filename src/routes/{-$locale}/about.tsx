import { createFileRoute } from '@tanstack/react-router';
import { CompanyMark, FounderPortrait } from '@/components/companies-strip';
import { CtaSection } from '@/components/cta-section';
import { PageIntro } from '@/components/page-intro';
import { RichText } from '@/components/rich-text';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { CARD, H3, LEAD, PROSE, TEXT_LINK } from '@/components/ui';
import { loadAboutContent } from '@/content/load';
import { CONTENT } from '@/lib/content';
import { pagePath } from '@/lib/page-registry';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';

const TINT = sectionFrame('tint');

export const Route = createFileRoute('/{-$locale}/about')({
  staticData: { page: 'about' },
  loader: ({ context }) => loadAboutContent(context.locale),
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
  const { page, companies } = Route.useLoaderData();
  const { founder } = CONTENT[locale];

  return (
    <>
      <section data-ground={TINT.ground} className={TINT.bg}>
        <Container className="pt-8 pb-10 md:pt-14 md:pb-16">
          <PageIntro title={page.title} lead={page.lead} />
        </Container>
      </section>
      <StickyZone locale={locale}>
        <section aria-labelledby="founder-title" data-ground="paper">
          <Container className="founder-block">
            <FounderPortrait founder={founder} className="founder-portrait" />
            <div>
              <h2 id="founder-title">{founder.name}</h2>
              <p className="mt-2 text-ui-l text-muted-fg">{founder.role}</p>
              <div className={`mt-6 grid gap-4 text-lg ${PROSE}`}>
                {page.story.map((paragraph) => (
                  <p key={paragraph.id}>
                    <RichText parts={paragraph.parts} />
                  </p>
                ))}
              </div>
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
            <ul className="principles">
              {page.principles.items.map((item) => (
                <li key={item.id} className="job-card">
                  <h3 className={H3}>{item.title}</h3>
                  <p className="text-ui-m text-fg-soft">{item.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
        <section aria-labelledby="companies-title" data-ground="paper">
          <Container className="py-section">
            <h2 id="companies-title">{page.companies.title}</h2>
            <p className={`mt-4 md:mt-5 ${LEAD}`}>{page.companies.lead}</p>
            <ul className="mt-8 grid grid-cols-2 gap-4 md:mt-12 md:gap-6 lg:grid-cols-5">
              {PORTFOLIO.map(({ key, name, href, logo }) => (
                <li key={key}>
                  <a
                    href={href}
                    className={`${CARD} group flex h-full flex-col items-start gap-3 p-5 motion-safe:transition-colors motion-safe:duration-(--duration-hover) pointer-fine:hover:border-fg md:p-8`}
                  >
                    <CompanyMark name={name} logo={logo} />
                    <span className="text-ui-s text-muted-fg">
                      {companies[key].category}
                    </span>
                    <span className="text-ui-m text-fg-soft md:text-base">
                      {companies[key].description}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-8 md:mt-10">
              <a
                href={pagePath(locale, 'cases')}
                className={`font-medium ${TEXT_LINK}`}
              >
                {page.companies.cases} →
              </a>
            </p>
          </Container>
        </section>
        <section
          aria-labelledby="vision-title"
          data-ground={TINT.ground}
          className={TINT.bg}
        >
          <Container className={TINT.pad}>
            <h2 id="vision-title">{page.vision.title}</h2>
            <p className="vision-text">{page.vision.text}</p>
          </Container>
        </section>
      </StickyZone>
      <CtaSection cta="about" copy={page.cta} locale={locale} />
    </>
  );
}
