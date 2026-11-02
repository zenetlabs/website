import { Section } from '@/components/section';
import { H3, TEXT_LINK } from '@/components/ui';
import type { HomeContent, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
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
}: {
  href: string;
  name: string;
  summary: string;
  price: string;
  heading?: 'h2' | 'h3';
}) {
  return (
    <li className="border-b border-hairline">
      <a
        href={href}
        className="group grid gap-3 py-6 md:grid-cols-12 md:items-baseline md:gap-8"
      >
        <Heading
          className={`${H3} underline decoration-transparent underline-offset-4 group-hover:decoration-fg md:col-span-4`}
        >
          {name}
        </Heading>
        <p className="text-fg-soft md:col-span-5">{summary}</p>
        <p className="font-mono text-ui-m tabular-nums md:col-span-3 md:text-right">
          {price}
        </p>
      </a>
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
            href={serviceHref(locale, service.id)}
            name={service.name}
            summary={service.summary}
            price={formatPriceSummary(locale, service.prices)}
          />
        ))}
      </ul>
      <p className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
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
