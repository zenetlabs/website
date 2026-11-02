import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { Section } from '@/components/section';
import {
  FEATURED_BADGE,
  H3,
  SECONDARY_BUTTON,
  TEXT_LINK,
} from '@/components/ui';
import type { HomeContent, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { CTA_TARGET, navHref } from '@/lib/nav';
import {
  isPublished,
  pagePath,
  type SiteFlags,
  serviceHref,
} from '@/lib/page-registry';
import { SITE } from '@/lib/site';

export function ServiceRow({
  href,
  name,
  summary,
  price,
  heading: Heading = 'h3',
  featured,
  dense,
}: {
  href: string;
  name: string;
  summary: string;
  price: string;
  heading?: 'h2' | 'h3';
  featured?: { badge: string; action: ReactNode };
  dense?: boolean;
}) {
  return (
    <li
      className={`border-b border-hairline ${featured ? '-mx-4 bg-highlight-soft px-4 md:-mx-6 md:px-6' : ''}`}
    >
      <a
        href={href}
        className={`service-row group ${dense ? 'service-row-dense' : ''}`}
      >
        {featured ? (
          <span className="basis-full md:col-span-full">
            <span className={FEATURED_BADGE}>{featured.badge}</span>
          </span>
        ) : null}
        <Heading
          className={`${H3} underline decoration-transparent underline-offset-4 group-hover:decoration-fg md:col-span-4`}
        >
          {name}
        </Heading>
        <p className="service-summary">{summary}</p>
        <p
          className={`order-2 font-mono tabular-nums md:order-none md:col-span-3 md:text-right ${featured ? 'text-lg md:text-xl' : 'text-ui-s md:text-ui-m'}`}
        >
          {price}
        </p>
      </a>
      {featured?.action}
    </li>
  );
}

export function ServiceLadder({
  copy,
  services,
  locale,
  site = SITE,
}: {
  copy: HomeContent['services'];
  services: Services;
  locale: Locale;
  site?: SiteFlags;
}) {
  const pricing = pagePath(locale, 'pricing');

  return (
    <Section
      id="services"
      title={copy.title}
      lead={copy.lead}
      variant="tint"
      width="wide"
    >
      <ul className="grid border-t border-hairline">
        {Object.values(services).map((service) => (
          <ServiceRow
            key={service.id}
            dense
            href={serviceHref(locale, service.id)}
            name={service.name}
            summary={service.summary}
            price={formatPriceSummary(locale, service.prices)}
            featured={
              service.id === 'diagnostic'
                ? {
                    badge: copy.startHere,
                    action: (
                      <p className="pt-1 pb-5">
                        <CtaLink
                          cta="start_here"
                          href={navHref(locale, CTA_TARGET)}
                          className={`${SECONDARY_BUTTON} max-sm:w-full`}
                        >
                          {copy.book}
                        </CtaLink>
                      </p>
                    ),
                  }
                : undefined
            }
          />
        ))}
      </ul>
      <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3 md:mt-10">
        <a href={pricing} className={`font-medium ${TEXT_LINK}`}>
          {copy.more} →
        </a>
        {isPublished('calculator', site) ? (
          <a
            href={pagePath(locale, 'calculator')}
            className={`font-medium ${TEXT_LINK}`}
          >
            {copy.calculator} →
          </a>
        ) : null}
      </p>
    </Section>
  );
}
