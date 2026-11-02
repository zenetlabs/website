import { createFileRoute } from '@tanstack/react-router';
import { CtaSection } from '@/components/cta-section';
import { FounderPortrait } from '@/components/founder-section';
import { RichText } from '@/components/rich-text';
import { Container, EmphasisTitle } from '@/components/section';
import { CARD, EYEBROW, H3, LEAD, PROSE } from '@/components/ui';
import { loadAboutContent } from '@/content/load';
import { CONTENT } from '@/lib/content';
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

  return (
    <>
      <Container className="py-16 md:py-24">
        <h1 className="max-w-4xl">
          <EmphasisTitle parts={page.title} marker />
        </h1>
        <p className={`mt-6 ${LEAD}`}>{page.lead}</p>
      </Container>
      <section
        aria-labelledby="founder-title"
        className="border-t border-hairline"
      >
        <Container className="grid gap-10 py-section md:grid-cols-[auto_1fr] md:gap-14">
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
      <section
        aria-labelledby="principles-title"
        className="border-t border-hairline"
      >
        <Container className="py-section">
          <h2 id="principles-title">{page.principles.title}</h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {page.principles.items.map((item) => (
              <li key={item.id} className={`${CARD} p-8`}>
                <h3 className={H3}>{item.title}</h3>
                <p className="mt-4 text-fg-soft">{item.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section
        aria-labelledby="companies-title"
        className="border-t border-hairline"
      >
        <Container className="py-section">
          <h2 id="companies-title">{page.companies.title}</h2>
          <p className={`mt-5 ${LEAD}`}>{page.companies.lead}</p>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {PORTFOLIO.map(({ key, name, href }) => (
              <li key={key}>
                <a
                  href={href}
                  className={`${CARD} group flex h-full flex-col gap-3 p-8 motion-safe:transition-colors motion-safe:duration-200 hover:border-fg`}
                >
                  <span className={EYEBROW}>{companies[key].category}</span>
                  <span className="font-display text-h3">{name}</span>
                  <span className="text-fg-soft">
                    {companies[key].description}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section
        aria-labelledby="vision-title"
        className="border-t border-hairline"
      >
        <Container className="py-section">
          <h2 id="vision-title">{page.vision.title}</h2>
          <p className={`mt-5 ${LEAD}`}>{page.vision.text}</p>
        </Container>
      </section>
      <CtaSection cta="about" copy={page.cta} locale={locale} />
    </>
  );
}
