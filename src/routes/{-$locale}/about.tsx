import { createFileRoute } from '@tanstack/react-router';
import { CtaSection } from '@/components/cta-section';
import { FounderPortrait } from '@/components/founder-section';
import { RichText } from '@/components/rich-text';
import { Container, EmphasisTitle } from '@/components/section';
import { CARD, EYEBROW } from '@/components/ui';
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
        <p className={EYEBROW}>{page.eyebrow}</p>
        <h1 className="mt-6 max-w-4xl text-balance">
          <EmphasisTitle parts={page.title} marker />
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-muted-fg">{page.lead}</p>
      </Container>
      <section
        aria-labelledby="founder-title"
        className="border-t border-hairline"
      >
        <Container className="grid gap-10 py-20 md:grid-cols-[auto_1fr] md:gap-14 md:py-28">
          <FounderPortrait founder={founder} />
          <div>
            <h2 id="founder-title">{founder.name}</h2>
            <p className={`mt-2 ${EYEBROW}`}>{founder.role}</p>
            <div className="mt-6 grid max-w-2xl gap-4 text-lg text-muted-fg">
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
        <Container className="py-20 md:py-28">
          <h2 id="principles-title">{page.principles.title}</h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {page.principles.items.map((item) => (
              <li key={item.id} className={`${CARD} p-8`}>
                <h3 className="font-display text-3xl leading-tight">
                  {item.title}
                </h3>
                <p className="mt-4 text-muted-fg">{item.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section
        aria-labelledby="companies-title"
        className="border-t border-hairline"
      >
        <Container className="py-20 md:py-28">
          <h2 id="companies-title">{page.companies.title}</h2>
          <p className="mt-6 max-w-2xl text-lg text-muted-fg">
            {page.companies.lead}
          </p>
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {PORTFOLIO.map(({ key, name, href }) => (
              <li key={key}>
                <a
                  href={href}
                  className={`${CARD} group flex h-full flex-col gap-3 p-8 motion-safe:transition-colors motion-safe:duration-200 hover:border-fg`}
                >
                  <span className={EYEBROW}>{companies[key].category}</span>
                  <span className="font-display text-[28px] leading-tight">
                    {name}
                  </span>
                  <span className="text-muted-fg">
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
        <Container className="py-20 md:py-28">
          <h2 id="vision-title">{page.vision.title}</h2>
          <p className="mt-6 max-w-3xl text-lg text-muted-fg">
            {page.vision.text}
          </p>
        </Container>
      </section>
      <CtaSection copy={page.cta} locale={locale} />
    </>
  );
}
