import { BeforeAfter } from '@/components/before-after';
import { Faq } from '@/components/faq';
import { FactsHero, GetStarted, RelatedLinks } from '@/components/page-blocks';
import { Container, Section } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { CALLOUT_CARD, LEAD, TEXT_LINK } from '@/components/ui';
import type {
  SectorPageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { crumbName, hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { TAPLANY_HREF } from '@/lib/portfolio';

export function SectorPage({
  locale,
  copy,
  hub,
  services,
}: {
  locale: Locale;
  copy: SectorPageContent;
  hub: ServicesHubContent;
  services: Services;
}) {
  const names = hubNames(hub);
  const { work, platform } = copy;
  const tint = sectionFrame('tint');

  return (
    <>
      <FactsHero
        page="travelAgencies"
        locale={locale}
        services={services}
        labels={hub.labels}
        hero={copy.hero}
        facts={copy.facts}
        button={copy.cta.button}
      />
      <StickyZone locale={locale}>
        <Section id="work" title={work.title} lead={work.lead}>
          <BeforeAfter
            rows={work.items.map((item) => ({
              id: item.id,
              title: item.title,
              before: item.today,
              after: item.automated,
            }))}
            beforeLabel={work.todayLabel}
            afterLabel={work.automatedLabel}
          />
        </Section>
        <section
          aria-labelledby="platform-title"
          data-ground={tint.ground}
          className={tint.bg}
        >
          <Container className={tint.pad}>
            <div className={CALLOUT_CARD}>
              <p className="logo-wordmark mb-5">Taplany</p>
              <h2 id="platform-title" className="text-h2-compact">
                {platform.title}
              </h2>
              <p className="mt-4 text-fg-soft">{platform.text}</p>
              <a
                href={TAPLANY_HREF}
                className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
              >
                {platform.link} →
              </a>
            </div>
          </Container>
        </section>
        <Section id="case" title={copy.case.title}>
          <p className={LEAD}>{copy.case.text}</p>
          <a
            href={pagePath(locale, 'viatsyCase')}
            className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
          >
            {crumbName(names, 'viatsyCase')} →
          </a>
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
