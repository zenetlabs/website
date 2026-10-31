import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { CtaSection } from '@/components/cta-section';
import { Container, EmphasisTitle } from '@/components/section';
import { CARD, EYEBROW, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type {
  Card,
  PageCta,
  PageFacts,
  PageHero,
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
import { PUBLIC_EMAIL } from '@/lib/site';

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
  eyebrow,
  title,
  lead,
  afterBreadcrumb = false,
}: {
  eyebrow: string;
  title: TitleParts;
  lead: string;
  afterBreadcrumb?: boolean;
}) {
  return (
    <>
      <p className={`${afterBreadcrumb ? 'mt-10 ' : ''}${EYEBROW}`}>
        {eyebrow}
      </p>
      <h1 id="service-title" className="mt-6 max-w-4xl text-balance">
        <EmphasisTitle parts={title} marker />
      </h1>
      <p className="mt-8 max-w-2xl text-lg text-muted-fg">{lead}</p>
    </>
  );
}

export function FactList({
  facts,
}: {
  facts: readonly {
    id: string;
    label: string;
    value: string;
    mono?: boolean;
  }[];
}) {
  return (
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
  );
}

export function FactsHero({
  page,
  locale,
  services,
  labels,
  hero,
  facts,
  button,
  breadcrumb,
}: {
  page: ServicePageId | LandingPageId;
  locale: Locale;
  services: Services;
  labels: ServicePageLabels;
  hero: PageHero;
  facts: PageFacts;
  button: string;
  breadcrumb?: ReactNode;
}) {
  const serviceId = serviceOf(page);

  return (
    <section aria-labelledby="service-title">
      <Container className="py-16 md:py-24">
        {breadcrumb}
        <HeroHeading {...hero} afterBreadcrumb={breadcrumb !== undefined} />
        <FactList
          facts={[
            { id: 'who', label: labels.who, value: facts.who },
            {
              id: 'price',
              label: labels.price,
              value: `${formatPriceSummary(locale, services[serviceId].prices)} (${labels.taxNote})`,
              mono: true,
            },
            { id: 'timeline', label: labels.timeline, value: facts.timeline },
            { id: 'start', label: labels.start, value: facts.start },
          ]}
        />
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <CtaLink
            cta="page_hero"
            href={navHref(locale, CTA_TARGET)}
            className={PRIMARY_BUTTON}
          >
            {button}
          </CtaLink>
          <a
            href={`${pagePath(locale, 'pricing')}#${serviceId}`}
            className={`font-medium ${TEXT_LINK}`}
          >
            {labels.pricing} →
          </a>
        </div>
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
        <p className="mt-8 text-muted-fg">
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
      <Container className="py-16 md:py-20">
        <h2 id="related-title" className="text-2xl md:text-3xl">
          {labels.related}
        </h2>
        <ul className="mt-6 grid gap-3 text-lg">
          {pages.map((target) => (
            <li key={target}>
              <a
                href={pagePath(locale, target)}
                className={`font-medium ${TEXT_LINK}`}
              >
                {crumbName(names, target)}
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
  );
}

export function CardGrid({
  items,
  locale,
}: {
  items: readonly (Card & { page?: PageId })[];
  locale: Locale;
}) {
  return (
    <ul className="grid gap-6 lg:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className={`${CARD} p-8`}>
          <h3 className="font-display text-2xl leading-tight">
            {item.page ? (
              <a href={pagePath(locale, item.page)} className={TEXT_LINK}>
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h3>
          <p className="mt-4 text-muted-fg">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function DataTable({
  labelledBy,
  columns,
  rows,
}: {
  labelledBy: string;
  columns: readonly string[];
  rows: readonly { id: string; cells: readonly string[] }[];
}) {
  return (
    <table
      aria-labelledby={labelledBy}
      className="w-full text-left text-sm sm:text-base"
    >
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column}
              scope="col"
              className={`pb-3 pr-4 font-normal ${EYEBROW}`}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ id, cells: [first, ...rest] }) => (
          <tr key={id} className="border-t border-hairline align-top">
            <th scope="row" className="w-[38%] py-4 pr-4 font-normal sm:w-auto">
              {first}
            </th>
            {rest.map((cell, index) => (
              <td key={columns[index + 1]} className="py-4 pr-4 text-muted-fg">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
