import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { CtaSection } from '@/components/cta-section';
import { Container, EmphasisTitle } from '@/components/section';
import {
  EYEBROW,
  H3,
  LEAD,
  PRIMARY_BUTTON_LG,
  TEXT_LINK,
} from '@/components/ui';
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
  title,
  lead,
  afterBreadcrumb = false,
}: {
  title: TitleParts;
  lead: string;
  afterBreadcrumb?: boolean;
}) {
  const top = afterBreadcrumb ? 'mt-10 ' : '';
  return (
    <>
      <h1 id="service-title" className={`${top}max-w-4xl`}>
        <EmphasisTitle parts={title} marker />
      </h1>
      <p className={`mt-6 ${LEAD}`}>{lead}</p>
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
    highlight?: boolean;
  }[];
}) {
  return (
    <dl className="facts">
      {facts.map((fact) => (
        <div key={fact.id} className={fact.highlight ? 'fact-highlight' : ''}>
          <dt className={EYEBROW}>{fact.label}</dt>
          <dd
            className={`mt-1.5 text-ui-m md:text-base ${fact.mono ? 'font-mono tabular-nums' : ''}`}
          >
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
      <Container className="py-12 md:py-24">
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
              highlight: true,
            },
            { id: 'timeline', label: labels.timeline, value: facts.timeline },
            { id: 'start', label: labels.start, value: facts.start },
          ]}
        />
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <CtaLink
            cta="page_hero"
            href={navHref(locale, CTA_TARGET)}
            className={PRIMARY_BUTTON_LG}
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
      <Container className="py-10 md:py-14">
        <h2 id="related-title" className="text-h2-compact">
          {labels.related}
        </h2>
        <ul className="related-links">
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

export function DataTable({
  labelledBy,
  columns,
  rows,
  iconColumn,
  dataColumns = [],
}: {
  labelledBy: string;
  columns: readonly string[];
  rows: readonly { id: string; cells: readonly string[] }[];
  iconColumn?: number;
  dataColumns?: readonly number[];
}) {
  const dataSet = new Set(dataColumns);
  return (
    <table aria-labelledby={labelledBy} className="data-table">
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
          <tr key={id} className="border-t border-hairline">
            <th
              scope="row"
              className="py-0.5 pr-4 text-left font-medium sm:w-[34%] sm:py-4"
            >
              {first}
            </th>
            {rest.map((cell, index) => (
              <td
                key={columns[index + 1]}
                data-label={columns[index + 1]}
                className={`py-0.5 pr-4 text-fg-soft sm:py-4 ${dataSet.has(index + 1) ? 'font-mono tabular-nums' : ''}`}
              >
                {iconColumn === index + 1 ? (
                  <span
                    aria-hidden="true"
                    className="icon icon-tool mr-2 align-[-0.15em] text-tool"
                  />
                ) : null}
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
