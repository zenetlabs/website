import { Faq } from '@/components/faq';
import { FactsHero, GetStarted, RelatedLinks } from '@/components/page-blocks';
import { Container, Section } from '@/components/section';
import { CARD, EYEBROW, TEXT_LINK } from '@/components/ui';
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
      <Section
        id="work"
        eyebrow={work.eyebrow}
        title={work.title}
        lead={work.lead}
      >
        <ul className="grid gap-6 lg:grid-cols-2">
          {work.items.map((item) => (
            <li key={item.id} className={`${CARD} p-8`}>
              <h3 className="font-display text-2xl leading-tight">
                {item.title}
              </h3>
              <p className={`mt-6 ${EYEBROW}`}>{work.todayLabel}</p>
              <p className="mt-2 text-muted-fg">{item.today}</p>
              <p className={`mt-6 ${EYEBROW}`}>{work.automatedLabel}</p>
              <p className="mt-2">{item.automated}</p>
            </li>
          ))}
        </ul>
      </Section>
      <section
        aria-labelledby="platform-title"
        className="border-t border-hairline"
      >
        <Container className="py-16 md:py-20">
          <div className={`${CARD} max-w-3xl p-8`}>
            <h2 id="platform-title" className="text-2xl md:text-3xl">
              {platform.title}
            </h2>
            <p className="mt-4 text-muted-fg">{platform.text}</p>
            <a
              href={TAPLANY_HREF}
              className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
            >
              {platform.link} →
            </a>
          </div>
        </Container>
      </section>
      <Section id="case" eyebrow={copy.case.eyebrow} title={copy.case.title}>
        <p className="max-w-2xl text-lg text-muted-fg">{copy.case.text}</p>
        <a
          href={pagePath(locale, 'viatsyCase')}
          className={`mt-6 inline-block font-medium ${TEXT_LINK}`}
        >
          {crumbName(names, 'viatsyCase')} →
        </a>
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
