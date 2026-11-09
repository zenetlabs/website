import type { ReactNode } from 'react';
import { CompanyMark } from '@/components/companies-strip';
import { CtaLink } from '@/components/cta-link';
import { CtaSection } from '@/components/cta-section';
import { BulletList } from '@/components/lists';
import { Container, EmphasisTitle, Section } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { EYEBROW, H3, LEAD, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type {
  Card,
  PageCta,
  PageFacts,
  PageHero,
  ServicePageContent,
  ServicePageLabels,
  Services,
  TitleParts,
} from '@/content/types';
import { crumbName, type Names } from '@/lib/crumb-names';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import {
  breadcrumbTrail,
  type LandingPageId,
  type PageId,
  pagePath,
  type ServicePageId,
  serviceOf,
} from '@/lib/page-registry';
import { portfolioOf } from '@/lib/portfolio';
import { PUBLIC_EMAIL } from '@/lib/site';

const TINT = sectionFrame('tint');

// A service page's proof: the company it runs at (its logo), what changed
// there, and the way to the full case and the hub.
export function CaseCallout({
  copy,
  locale,
  names,
}: {
  copy: ServicePageContent['case'];
  locale: Locale;
  names: Names;
}) {
  const company = copy.company ? portfolioOf(copy.company) : undefined;
  return (
    <Section id="case" title={copy.title} variant="tint">
      <div className="case-callout">
        <div className="lg:col-span-7">
          {company ? (
            <CompanyMark name={company.name} logo={company.logo} />
          ) : null}
          <p className={company ? 'mt-4 text-fg-soft md:mt-5' : 'text-fg-soft'}>
            {copy.text}
          </p>
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-3 md:mt-6 md:gap-x-8">
            {copy.page ? (
              <a
                href={pagePath(locale, copy.page)}
                className={`font-medium ${TEXT_LINK}`}
              >
                {crumbName(names, copy.page)} →
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
        <BulletList
          items={copy.points}
          marker="tick"
          className="lg:col-span-5"
        />
      </div>
    </Section>
  );
}

export function Breadcrumb({
  page,
  locale,
  names,
  label,
}: {
  page: PageId;
  locale: Locale;
  names: Names;
  label: string;
}) {
  const trail = breadcrumbTrail(page);
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

export function HeroHeading({
  title,
  lead,
  afterBreadcrumb = false,
  actions,
}: {
  title: TitleParts;
  lead: string;
  afterBreadcrumb?: boolean;
  actions?: ReactNode;
}) {
  const top = afterBreadcrumb ? 'mt-6 md:mt-10 ' : '';
  return (
    <>
      <h1 id="service-title" className={`${top}max-w-4xl`}>
        <EmphasisTitle parts={title} />
      </h1>
      {actions}
      <p className={`mt-4 md:mt-6 ${LEAD}`}>{lead}</p>
    </>
  );
}

type Fact = {
  id: string;
  label: string;
  value: string;
  highlight?: boolean;
};

export function FactList({
  facts,
  variant = 'strip',
}: {
  facts: readonly Fact[];
  variant?: 'strip' | 'card';
}) {
  return (
    <dl className={variant === 'card' ? 'facts-card' : 'facts'}>
      {facts.map((fact) => (
        <div key={fact.id} data-highlight={fact.highlight ? '' : undefined}>
          <dt className={EYEBROW}>{fact.label}</dt>
          <dd className="fact-value">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The hero of a service or landing page, on the tint ground: the offer and its
// actions on the left, and on the right the page's figure (the flow it runs)
// or, without one, its facts as a card. With a figure the facts run below.
export function FactsHero({
  page,
  locale,
  services,
  labels,
  hero,
  facts,
  button,
  breadcrumb,
  figure,
}: {
  page: ServicePageId | LandingPageId;
  locale: Locale;
  services: Services;
  labels: ServicePageLabels;
  hero: PageHero;
  facts: PageFacts;
  button: string;
  breadcrumb?: ReactNode;
  figure?: ReactNode;
}) {
  const serviceId = serviceOf(page);
  const list: readonly Fact[] = [
    { id: 'who', label: labels.who, value: facts.who },
    {
      id: 'price',
      label: labels.price,
      value: `${formatPriceSummary(locale, services[serviceId].prices)} (${labels.taxNote})`,
      highlight: true,
    },
    { id: 'timeline', label: labels.timeline, value: facts.timeline },
    { id: 'start', label: labels.start, value: facts.start },
  ];

  return (
    <section
      aria-labelledby="service-title"
      data-ground={TINT.ground}
      className={TINT.bg}
    >
      <Container className="page-hero">
        <div className="lg:col-span-7">
          {breadcrumb}
          <HeroHeading
            {...hero}
            afterBreadcrumb={breadcrumb !== undefined}
            actions={
              <div className="page-hero-actions">
                <CtaLink
                  cta="page_hero"
                  href={navHref(locale, CTA_TARGET)}
                  className={PRIMARY_BUTTON}
                >
                  {button}
                </CtaLink>
                <a
                  href={pagePath(locale, 'pricing')}
                  className={`font-medium ${TEXT_LINK}`}
                >
                  {labels.pricing} →
                </a>
              </div>
            }
          />
        </div>
        <div className="lg:col-span-5">
          {figure ?? <FactList facts={list} variant="card" />}
        </div>
        {figure ? (
          <div className="lg:col-span-12">
            <FactList facts={list} />
          </div>
        ) : null}
      </Container>
    </section>
  );
}

export function GetStarted({
  locale,
  cta,
  mail,
}: {
  locale: Locale;
  cta: PageCta;
  mail: string;
}) {
  return (
    <CtaSection
      cta="page_cta"
      copy={cta}
      locale={locale}
      footer={
        <p className="mt-8 text-fg-soft">
          {mail}{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
        </p>
      }
    />
  );
}

export function RelatedLinks({
  locale,
  pages,
  names,
  labels,
}: {
  locale: Locale;
  pages: readonly PageId[];
  names: Names;
  labels: ServicePageLabels;
}) {
  return (
    <section
      aria-labelledby="related-title"
      className="border-t border-hairline"
    >
      <Container className="py-7 md:py-14">
        <h2 id="related-title" className="text-h2-compact">
          {labels.related}
        </h2>
        <ul className="related-links">
          {[
            ...pages.map((target) => ({
              href: pagePath(locale, target),
              name: crumbName(names, target),
            })),
            { href: pagePath(locale, 'services'), name: labels.allServices },
          ].map(({ href, name }) => (
            <li key={href}>
              <a href={href} className="hover-line font-medium">
                {name}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

export function UseCaseList({
  items,
  locale,
}: {
  items: readonly (Card & { page?: PageId })[];
  locale: Locale;
}) {
  return (
    <ul className="usecase-list">
      {items.map((item) => (
        <li key={item.id}>
          <h3 className={H3}>
            {item.page ? (
              <a href={pagePath(locale, item.page)} className={TEXT_LINK}>
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h3>
          <p className="mt-2 text-ui-m text-fg-soft md:mt-3 md:text-base">
            {item.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
