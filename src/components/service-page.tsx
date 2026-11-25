import { DeskClose } from '@/components/desk-close';
import { Faq } from '@/components/faq';
import { FlowBoard } from '@/components/flow-board';
import { Ledger } from '@/components/ledger';
import {
  Breadcrumb,
  CaseCallout,
  RelatedLinks,
} from '@/components/page-blocks';
import { HeroActions, PageHero } from '@/components/page-hero';
import { Includes, PriceTicket } from '@/components/price-ticket';
import { Process } from '@/components/process';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import type {
  DeskCloseCopy,
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { type ServicePageId, serviceOf } from '@/lib/page-registry';

export function ServicePage({
  page,
  locale,
  copy,
  hub,
  services,
  includes,
  close,
}: {
  page: ServicePageId;
  locale: Locale;
  copy: ServicePageContent;
  hub: ServicesHubContent;
  services: Services;
  includes: readonly string[];
  close: DeskCloseCopy;
}) {
  const names = hubNames(hub);

  return (
    <>
      <PageHero
        title={copy.hero.title}
        lead={copy.hero.lead}
        actions={
          <HeroActions
            locale={locale}
            button={copy.cta.button}
            secondary={{ label: hub.labels.pricing, page: 'pricing' }}
          />
        }
        breadcrumb={
          <Breadcrumb
            page={page}
            locale={locale}
            names={names}
            label={hub.labels.breadcrumb}
          />
        }
        stage={
          <>
            {copy.flow ? (
              <FlowBoard
                flow={copy.flow}
                actors={hub.labels.actors}
                approval={copy.approval}
              />
            ) : null}
            <PriceTicket
              service={services[serviceOf(page)]}
              facts={copy.facts}
              labels={hub.labels}
              locale={locale}
            />
          </>
        }
        aside={<Includes label={hub.labels.included} items={includes} />}
      />
      <StickyZone locale={locale}>
        <Section
          id="use-cases"
          title={copy.useCases.title}
          intro={copy.hero.intro}
          lead={copy.useCases.lead}
        >
          <Ledger items={copy.useCases.items} locale={locale} />
        </Section>
        <Process id="how" copy={copy.how} rail variant="tint" />
        <CaseCallout copy={copy.case} locale={locale} names={names} />
        <Faq copy={copy.faq} items={copy.faq.items} />
        <RelatedLinks
          locale={locale}
          pages={copy.related}
          names={names}
          labels={hub.labels}
        />
      </StickyZone>
      <DeskClose
        cta={copy.cta}
        faq={copy.faq}
        mail={hub.labels.mail}
        {...close}
        locale={locale}
      />
    </>
  );
}
