import { createFileRoute } from '@tanstack/react-router';
import { CalculatorCallout } from '@/components/calculator-callout';
import { DeskClose } from '@/components/desk-close';
import { Faq } from '@/components/faq';
import { Ladder } from '@/components/ladder';
import { Ledger } from '@/components/ledger';
import { PageIntroSection } from '@/components/page-intro';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { loadDeskClose, loadPricingContent } from '@/content/load';
import { pricingStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/pricing')({
  staticData: { page: 'pricing' },
  loader: async ({ context }) => {
    const [content, close] = await Promise.all([
      loadPricingContent(context.locale),
      loadDeskClose(context.locale),
    ]);
    return { ...content, close };
  },
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'pricing', loaderData.page.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? pricingStructuredData(
          match.context.locale,
          loaderData.page,
          loaderData.services,
        )
      : [],
  component: Pricing,
});

function Pricing() {
  const { locale } = Route.useRouteContext();
  const { page, services, hub, faq, includes, close } = Route.useLoaderData();
  const tint = sectionFrame('tint');

  return (
    <>
      <PageIntroSection
        title={page.title}
        lead={page.lead}
        note={page.taxNote}
      />
      {/* The bar waits until the ladder has offered its own booking button */}
      <section aria-label={page.catalog} data-ground="paper">
        <Container className="pt-8 pb-section md:pt-10">
          <Ladder
            mode="pricing"
            services={services}
            hub={hub}
            more={page.labels.more}
            timeline={page.timelines.diagnostic}
            plan={page.plan}
            includes={includes}
            locale={locale}
          />
        </Container>
      </section>
      <StickyZone locale={locale}>
        <CalculatorCallout copy={page.calculator} locale={locale} />
        <section
          aria-labelledby="how-title"
          data-ground={tint.ground}
          className={tint.bg}
        >
          <Container className={tint.pad}>
            <h2 id="how-title">{page.how.title}</h2>
            <div className="mt-6 md:mt-12">
              <Ledger items={page.how.items} locale={locale} />
            </div>
          </Container>
        </section>
        <Faq copy={page.faq} items={faq} />
      </StickyZone>
      <DeskClose
        cta={page.cta}
        faq={{ items: faq }}
        mail={hub.labels.mail}
        {...close}
        locale={locale}
      />
    </>
  );
}
