import { Faq } from '@/components/faq';
import { FlowDiagram } from '@/components/flow-diagram';
import {
  Breadcrumb,
  CaseCallout,
  FactsHero,
  GetStarted,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Process } from '@/components/process';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import type {
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import type { ServicePageId } from '@/lib/page-registry';

export function ServicePage({
  page,
  locale,
  copy,
  hub,
  services,
}: {
  page: ServicePageId;
  locale: Locale;
  copy: ServicePageContent;
  hub: ServicesHubContent;
  services: Services;
}) {
  const names = hubNames(hub);

  return (
    <>
      <FactsHero
        page={page}
        locale={locale}
        services={services}
        labels={hub.labels}
        hero={copy.hero}
        facts={copy.facts}
        button={copy.cta.button}
        breadcrumb={
          <Breadcrumb
            page={page}
            locale={locale}
            names={names}
            label={hub.labels.breadcrumb}
          />
        }
        figure={
          copy.flow ? (
            <FlowDiagram
              steps={copy.flow.steps}
              actors={hub.labels.actors}
              caption={copy.flow.caption}
              approval={copy.approval}
            />
          ) : undefined
        }
      />
      <StickyZone locale={locale}>
        <Section
          id="use-cases"
          title={copy.useCases.title}
          lead={copy.useCases.lead}
        >
          <UseCaseList items={copy.useCases.items} locale={locale} />
        </Section>
        <Process id="how" copy={copy.how} />
        <CaseCallout copy={copy.case} locale={locale} names={names} />
        <Faq copy={copy.faq} items={copy.faq.items} />
        <RelatedLinks
          locale={locale}
          pages={copy.related}
          names={names}
          labels={hub.labels}
        />
      </StickyZone>
      <GetStarted locale={locale} cta={copy.cta} mail={hub.labels.mail} />
    </>
  );
}
