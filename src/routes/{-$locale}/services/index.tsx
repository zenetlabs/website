import { createFileRoute } from '@tanstack/react-router';
import { DeskClose } from '@/components/desk-close';
import { Ladder } from '@/components/ladder';
import { Ledger } from '@/components/ledger';
import { PageIntroSection } from '@/components/page-intro';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { LEAD, TEXT_LINK } from '@/components/ui';
import { loadDeskClose, loadServicesHubContent } from '@/content/load';
import type { HubCardPage, LedgerItem } from '@/content/types';
import { PAGE_FLOWS } from '@/lib/offer-flows';
import {
  pagePath,
  SERVICE_PAGE_IDS,
  type ServicePageId,
} from '@/lib/page-registry';
import { servicesHubStructuredData } from '@/lib/page-structured-data';
import { contentHead } from '@/lib/pages';

export const Route = createFileRoute('/{-$locale}/services/')({
  staticData: { page: 'services' },
  loader: async ({ context }) => {
    const [content, close] = await Promise.all([
      loadServicesHubContent(context.locale),
      loadDeskClose(context.locale),
    ]);
    return { ...content, close };
  },
  head: ({ match, loaderData }) =>
    loaderData
      ? contentHead(match.context.locale, 'services', loaderData.hub.meta)
      : {},
  scripts: ({ match, loaderData }) =>
    loaderData
      ? servicesHubStructuredData(match.context.locale, loaderData.hub)
      : [],
  component: ServicesHub,
});

function isHubCard(page: ServicePageId): page is HubCardPage {
  return page !== 'diagnostic' && page !== 'maintenance';
}

function ServicesHub() {
  const { locale } = Route.useRouteContext();
  const { hub, services, close } = Route.useLoaderData();
  const tint = sectionFrame('tint');
  const rows: LedgerItem[] = SERVICE_PAGE_IDS.filter(isHubCard).map((page) => ({
    id: page,
    title: hub.cards[page].name,
    text: hub.cards[page].summary,
    page,
    tiles: PAGE_FLOWS[page],
  }));

  return (
    <>
      <PageIntroSection title={hub.title} lead={hub.lead} />
      <StickyZone locale={locale}>
        <section data-ground="paper">
          <Container className="py-section">
            <p className={LEAD}>{hub.intro}</p>
            <div className="mt-8 md:mt-10">
              <Ladder
                mode="hub"
                services={services}
                hub={hub}
                locale={locale}
              />
            </div>
            <p className="mt-8">
              <a
                href={pagePath(locale, 'pricing')}
                className={`font-medium ${TEXT_LINK}`}
              >
                {hub.pricing}
              </a>
            </p>
          </Container>
        </section>
        <section
          id="hub-services"
          aria-labelledby="hub-services-title"
          data-ground={tint.ground}
          className={tint.bg}
        >
          <Container className={tint.pad}>
            <h2 id="hub-services-title">{hub.meta.title}</h2>
            <div className="mt-6 md:mt-12">
              <Ledger items={rows} locale={locale} />
            </div>
          </Container>
        </section>
      </StickyZone>
      <DeskClose
        cta={hub.start}
        mail={hub.labels.mail}
        {...close}
        locale={locale}
      />
    </>
  );
}
