import { Section } from '@/components/section';
import { TEXT_LINK } from '@/components/ui';
import type { HomeContent, Services } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { formatPriceSummary } from '@/lib/money';
import { pagePath } from '@/lib/page-registry';

export function ServiceLadder({
  copy,
  services,
  locale,
}: {
  copy: HomeContent['services'];
  services: Services;
  locale: Locale;
}) {
  const pricing = pagePath(locale, 'pricing');

  return (
    <Section
      id="services"
      eyebrow={copy.eyebrow}
      title={copy.title}
      lead={copy.lead}
    >
      <ul className="grid border-t border-hairline">
        {Object.values(services).map((service) => (
          <li key={service.id} className="border-b border-hairline">
            <a
              href={`${pricing}#${service.id}`}
              className="group grid gap-3 py-6 md:grid-cols-12 md:items-baseline md:gap-8"
            >
              <h3 className="font-display text-2xl leading-tight underline decoration-transparent underline-offset-4 group-hover:decoration-fg md:col-span-4">
                {service.name}
              </h3>
              <p className="text-muted-fg md:col-span-5">{service.summary}</p>
              <p className="font-mono text-sm md:col-span-3 md:text-right">
                {formatPriceSummary(locale, service.prices)}
              </p>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-10">
        <a href={pricing} className={`font-medium ${TEXT_LINK}`}>
          {copy.more} →
        </a>
      </p>
    </Section>
  );
}
