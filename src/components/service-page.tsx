import { CtaSection } from '@/components/cta-section';
import { Faq } from '@/components/faq';
import { Process } from '@/components/process';
import { Container, EmphasisTitle, Section } from '@/components/section';
import {
  BULLET_ITEM,
  CARD,
  EYEBROW,
  PRIMARY_BUTTON,
  TEXT_LINK,
} from '@/components/ui';
import type {
  ServicePageContent,
  Services,
  ServicesHubContent,
} from '@/content/types';
import { crumbName, servicePageNames } from '@/lib/crumb-names';
import { type Locale, messages } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import {
  breadcrumbTrail,
  pagePath,
  type ServicePageId,
  serviceOf,
} from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

function Breadcrumb({
  page,
  locale,
  hub,
  label,
}: {
  page: ServicePageId;
  locale: Locale;
  hub: ServicesHubContent;
  label: string;
}) {
  const trail = breadcrumbTrail(page);
  const names = servicePageNames(hub, page);
  return (
    <nav aria-label={label} className="text-sm text-muted-fg">
      <ol className="flex items-center gap-2 whitespace-nowrap">
        {trail.map((step, index) => {
          const name = crumbName(names, step);
          return index === trail.length - 1 ? (
            <li key={step} className="min-w-0">
              <span aria-current="page" className="block truncate">
                {name}
              </span>
            </li>
          ) : (
            <li key={step} className="flex shrink-0 gap-2">
              <a href={pagePath(locale, step)} className={TEXT_LINK}>
                {name}
              </a>
              <span aria-hidden="true">/</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

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
  const labels = messages[locale].servicePage;
  const serviceId = serviceOf(page);
  const cta = navHref(locale, CTA_TARGET);
  const facts = [
    { id: 'who', label: labels.who, value: copy.facts.who, mono: false },
    {
      id: 'price',
      label: labels.price,
      value: `${formatPriceSummary(locale, services[serviceId].prices)} (${labels.taxNote})`,
      mono: true,
    },
    {
      id: 'timeline',
      label: labels.timeline,
      value: copy.facts.timeline,
      mono: false,
    },
    { id: 'start', label: labels.start, value: copy.facts.start, mono: false },
  ];

  return (
    <>
      <section aria-labelledby="service-title">
        <Container className="py-16 md:py-24">
          <Breadcrumb
            page={page}
            locale={locale}
            hub={hub}
            label={labels.breadcrumb}
          />
          <p className={`mt-10 ${EYEBROW}`}>{copy.hero.eyebrow}</p>
          <h1 id="service-title" className="mt-6 max-w-4xl text-balance">
            <EmphasisTitle parts={copy.hero.title} marker />
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-muted-fg">
            {copy.hero.lead}
          </p>
          <dl className="mt-10 grid max-w-4xl gap-6 border-t border-hairline pt-8 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.id}>
                <dt className={EYEBROW}>{fact.label}</dt>
                <dd className={`mt-2 ${fact.mono ? 'font-mono' : ''}`}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a href={cta} className={PRIMARY_BUTTON}>
              {copy.cta.button}
            </a>
            <a
              href={`${pagePath(locale, 'pricing')}#${serviceId}`}
              className={`font-medium ${TEXT_LINK}`}
            >
              {labels.pricing} →
            </a>
          </div>
        </Container>
      </section>
      <Section
        id="use-cases"
        eyebrow={copy.useCases.eyebrow}
        title={copy.useCases.title}
        lead={copy.useCases.lead}
      >
        <ul className="grid gap-6 lg:grid-cols-2">
          {copy.useCases.items.map((item) => (
            <li key={item.id} className={`${CARD} p-8`}>
              <h3 className="font-display text-2xl leading-tight">
                {item.title}
              </h3>
              <p className="mt-4 text-muted-fg">{item.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Process id="how" copy={copy.how} />
      <Section id="case" eyebrow={copy.case.eyebrow} title={copy.case.title}>
        <div className={`${CARD} max-w-3xl p-8`}>
          <p className="text-muted-fg">{copy.case.text}</p>
          <ul className="mt-6 grid gap-3">
            {copy.case.points.map((point) => (
              <li key={point} className={BULLET_ITEM}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </Section>
      <Faq copy={copy.faq} items={copy.faq.items} />
      <CtaSection
        copy={copy.cta}
        locale={locale}
        footer={
          <p className="mt-8 text-muted-fg">
            {labels.mail}{' '}
            <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
              {PUBLIC_EMAIL}
            </a>
          </p>
        }
      />
      <section
        aria-labelledby="related-title"
        className="border-t border-hairline"
      >
        <Container className="py-16 md:py-20">
          <h2 id="related-title" className="text-2xl md:text-3xl">
            {labels.related}
          </h2>
          <ul className="mt-6 grid gap-3 text-lg">
            {copy.related.map((target) => (
              <li key={target}>
                <a
                  href={pagePath(locale, target)}
                  className={`font-medium ${TEXT_LINK}`}
                >
                  {hub.cards[target].name}
                </a>
              </li>
            ))}
            <li>
              <a
                href={pagePath(locale, 'services')}
                className={`font-medium ${TEXT_LINK}`}
              >
                {labels.allServices}
              </a>
            </li>
          </ul>
        </Container>
      </section>
    </>
  );
}
