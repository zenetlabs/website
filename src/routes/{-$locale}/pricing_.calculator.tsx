import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useRef } from 'react';
import { CalculatorForm, EstimatePanel } from '@/components/calculator';
import { ContactFallback } from '@/components/contact-intro';
import { Breadcrumb, HeroHeading } from '@/components/page-blocks';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { H3, PROSE, TEXT_LINK } from '@/components/ui';
import { loadCalculatorContent } from '@/content/load';
import {
  answersFromSearch,
  answersQuery,
  calculatorSearch,
  searchFromAnswers,
} from '@/lib/calculator-answers';
import { leadMessage } from '@/lib/calculator-text';
import { contentRouteOptions } from '@/lib/content-route';
import { estimate, market } from '@/lib/estimate';
import { pagePath } from '@/lib/page-registry';
import { calculatorStructuredData } from '@/lib/page-structured-data';
import { SITE_NAME } from '@/lib/seo';
import { track } from '@/lib/track';

const TINT = sectionFrame('tint');
const COMPACT = sectionFrame('compact');

const LazyContactSection = lazy(() =>
  import('@/components/contact-section').then(({ ContactSection }) => ({
    default: ContactSection,
  })),
);

export const Route = createFileRoute('/{-$locale}/pricing_/calculator')({
  ...contentRouteOptions(
    'calculator',
    loadCalculatorContent,
    (locale, { copy }) => calculatorStructuredData(locale, copy),
  ),
  validateSearch: (raw: Record<string, unknown>) => raw,
  component: Calculator,
});

function Calculator() {
  const { locale } = Route.useRouteContext();
  const { copy, services } = Route.useLoaderData();
  const search = calculatorSearch(Route.useSearch());
  const navigate = Route.useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const answers = answersFromSearch(search);
  const result =
    answers &&
    estimate(answers, market(services.diagnostic.prices[0].currency, services));

  async function onAnswers(next: NonNullable<typeof answers>) {
    const own = searchFromAnswers(next);
    await navigate({
      search: (previous) => ({
        ...own,
        ...Object.fromEntries(
          Object.entries(previous).filter(([key]) => !(key in own)),
        ),
      }),
      hash: 'estimate',
      resetScroll: false,
    });
    heading.current?.focus();
    track('calculator_complete', { project_type: next.type });
  }

  return (
    <>
      <section aria-labelledby="service-title">
        <Container className="py-16 md:py-24">
          <Breadcrumb
            page="calculator"
            locale={locale}
            names={{
              home: SITE_NAME,
              pricing: copy.breadcrumb.pricing,
              calculator: copy.meta.title,
            }}
            label={copy.breadcrumb.label}
          />
          <HeroHeading title={copy.title} lead={copy.lead} afterBreadcrumb />
          <p className="mt-6 text-ui-s text-muted-fg">{copy.taxNote}</p>
          <p className="mt-4">
            <a
              href={pagePath(locale, 'pricing')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.pricingLink} →
            </a>
          </p>
        </Container>
      </section>
      <section data-ground={TINT.ground} className={TINT.bg}>
        <Container className={COMPACT.pad}>
          <div className="max-w-3xl">
            <h2 className={H3}>{copy.disclaimer.title}</h2>
            <p className={`mt-3 ${PROSE}`}>{copy.disclaimer.text}</p>
            <p className="mt-3 max-w-[60ch] text-ui-s text-muted-fg">
              {copy.privacy}
            </p>
          </div>
        </Container>
      </section>
      <Container className="grid gap-10 py-section md:grid-cols-12 md:gap-12">
        <div className="md:col-span-7">
          <CalculatorForm
            key={JSON.stringify(search)}
            copy={copy}
            locale={locale}
            search={search}
            onAnswers={onAnswers}
          />
        </div>
        <div className="sticky-panel md:col-span-5">
          <EstimatePanel
            copy={copy}
            locale={locale}
            services={services}
            estimate={result}
            headingRef={heading}
          />
        </div>
      </Container>
      {answers && result ? (
        <Suspense fallback={<ContactFallback copy={copy.contact} />}>
          <LazyContactSection
            key={answersQuery(answers)}
            copy={copy.contact}
            prefill={{
              method: 'calculator',
              message: leadMessage({
                locale,
                copy,
                services,
                answers,
                estimate: result,
              }),
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
