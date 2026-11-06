import { createFileRoute } from '@tanstack/react-router';
import { CompanyMark } from '@/components/companies-strip';
import { CtaSection } from '@/components/cta-section';
import { FounderPortrait } from '@/components/founder-section';
import { RichText } from '@/components/rich-text';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { CARD, H3, LEAD, PROSE, TEXT_LINK } from '@/components/ui';
import { loadAboutContent } from '@/content/load';
import { CONTENT } from '@/lib/content';
import { pagePath } from '@/lib/page-registry';
import { breadcrumbStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';
import { PORTFOLIO } from '@/lib/portfolio';

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
  const vision = sectionFrame('tint');

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
        <section aria-labelledby="founder-title" data-ground="paper">
          <Container className="grid gap-6 pb-section md:grid-cols-[auto_1fr] md:gap-14">
            <FounderPortrait founder={founder} />
            <div>
              <h2 id="founder-title">{founder.name}</h2>
              <p className="mt-2 text-ui-s text-muted-fg">{founder.role}</p>
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
        <section aria-labelledby="principles-title" data-ground="paper">
          <Container className="py-section">
            <h2 id="principles-title">{page.principles.title}</h2>
            <ul className="mt-8 grid gap-x-14 gap-y-8 md:mt-12 md:grid-cols-2 md:gap-y-10">
              {page.principles.items.map((item) => (
                <li key={item.id} className="border-t border-hairline pt-5">
                  <h3 className={H3}>{item.title}</h3>
                  <p className="mt-3 max-w-[60ch] text-fg-soft">{item.text}</p>
                </li>
              ))}
            </ul>
          </Container>
        </section>
        <section aria-labelledby="companies-title" data-ground="paper">
          <Container className="py-section">
            <h2 id="companies-title">{page.companies.title}</h2>
            <p className={`mt-4 md:mt-5 ${LEAD}`}>{page.companies.lead}</p>
            <ul className="mt-8 grid grid-cols-2 gap-4 md:mt-12 md:gap-6 lg:grid-cols-3">
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
          data-ground={vision.ground}
          className={vision.bg}
        >
          <Container className={vision.pad}>
            <h2 id="vision-title">{page.vision.title}</h2>
            <p className="mt-5 max-w-[60ch] text-pretty text-h2-compact md:mt-8">
              {page.vision.text}
            </p>
          </Container>
        </section>
      </StickyZone>
      <CtaSection cta="about" copy={page.cta} locale={locale} />
    </>
  );
}
