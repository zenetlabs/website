import { BeforeAfter } from '@/components/before-after';
import { CompanyMark } from '@/components/companies-strip';
import { Faq } from '@/components/faq';
import { FactsHero, GetStarted, RelatedLinks } from '@/components/page-blocks';
import { Container, Section } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { StickyZone } from '@/components/sticky-cta';
import { LEAD, TEXT_LINK } from '@/components/ui';
import type {
  SectorPageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { crumbName, hubNames } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { portfolioOf } from '@/lib/portfolio';

const TAPLANY = portfolioOf('taplany');

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
            <div className="case-callout">
              <div className="lg:col-span-4">
                <span className="platform-mark">
                  <CompanyMark name={TAPLANY.name} logo={TAPLANY.logo} />
                </span>
              </div>
              <div className="lg:col-span-8">
                <h2 id="platform-title" className="text-h2-compact">
                  {platform.title}
                </h2>
                <p className="mt-4 max-w-[60ch] text-fg-soft">
                  {platform.text}
                </p>
                <a
                  href={TAPLANY.href}
                  className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
                >
                  {platform.link} →
                </a>
              </div>
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
