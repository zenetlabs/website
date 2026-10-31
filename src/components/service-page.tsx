import { Faq } from '@/components/faq';
import { BulletList } from '@/components/lists';
import {
  Breadcrumb,
  CardGrid,
  FactsHero,
  GetStarted,
  RelatedLinks,
} from '@/components/page-blocks';
import { Process } from '@/components/process';
import { Section } from '@/components/section';
import { CARD, TEXT_LINK } from '@/components/ui';
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
      <Section
        id="use-cases"
        eyebrow={copy.useCases.eyebrow}
        title={copy.useCases.title}
        lead={copy.useCases.lead}
      >
        <CardGrid items={copy.useCases.items} locale={locale} />
      </Section>
      <Process id="how" copy={copy.how} />
      <Section id="case" eyebrow={copy.case.eyebrow} title={copy.case.title}>
        <div className={`${CARD} max-w-3xl p-8`}>
          <p className="text-muted-fg">{copy.case.text}</p>
          <BulletList items={copy.case.points} className="mt-6" />
          {copy.case.page ? (
            <a
              href={pagePath(locale, copy.case.page)}
              className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
            >
              {crumbName(names, copy.case.page)} →
            </a>
          ) : null}
        </div>
      </Section>
      <Faq copy={copy.faq} items={copy.faq.items} />
      <GetStarted locale={locale} cta={copy.cta} mail={hub.labels.mail} />
      <RelatedLinks
        locale={locale}
        pages={copy.related}
        names={names}
        labels={hub.labels}
      />
    </>
  );
}
