import { Faq } from '@/components/faq';
import { FlowSection } from '@/components/flow-section';
import { BulletList } from '@/components/lists';
import {
  Breadcrumb,
  FactsHero,
  GetStarted,
  RelatedLinks,
  UseCaseList,
} from '@/components/page-blocks';
import { Process } from '@/components/process';
import { Section } from '@/components/section';
import { StickyZone } from '@/components/sticky-cta';
import { CALLOUT_CARD, TEXT_LINK } from '@/components/ui';
import type {
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { crumbName, hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { pagePath, type ServicePageId } from '@/lib/page-registry';

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
      />
      <StickyZone locale={locale}>
        <Section
          id="use-cases"
          title={copy.useCases.title}
          lead={copy.useCases.lead}
        >
          <UseCaseList items={copy.useCases.items} locale={locale} />
        </Section>
        {copy.flow ? (
          <FlowSection
            copy={copy.flow}
            actors={hub.labels.actors}
            approval={copy.approval}
          />
        ) : null}
        <Process id="how" copy={copy.how} />
        <Section id="case" title={copy.case.title} variant="tint">
          <div className={CALLOUT_CARD}>
            <p className="text-fg-soft">{copy.case.text}</p>
            <BulletList items={copy.case.points} className="mt-6" />
            <p className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {copy.case.page ? (
                <a
                  href={pagePath(locale, copy.case.page)}
                  className={`font-medium ${TEXT_LINK}`}
                >
                  {crumbName(names, copy.case.page)} →
                </a>
              ) : null}
              <a
                href={pagePath(locale, 'cases')}
                className={`font-medium ${TEXT_LINK}`}
              >
                {crumbName(names, 'cases')} →
              </a>
            </p>
          </div>
        </Section>
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
