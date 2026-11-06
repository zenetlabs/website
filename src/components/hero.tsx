import { AgentDesk } from '@/components/agent-desk';
import { CtaLink } from '@/components/cta-link';
import { Container, EmphasisTitle } from '@/components/section';
import { LEAD, PRIMARY_BUTTON_FULL, SECONDARY_BUTTON } from '@/components/ui';
import type { Founder, HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

export function Hero({
  copy,
  desk,
  diagnosticPrice,
  founder,
  locale,
}: {
  copy: HomeContent['hero'];
  desk: HomeContent['desk'];
  diagnosticPrice: string;
  founder: Founder;
  locale: Locale;
}) {
  const [factBefore = '', factAfter = ''] = copy.fact.split('{price}');
  return (
    <section data-ground="tint" className="bg-tint">
      <Container className="hero-grid">
        <div className="lg:col-span-5 lg:pr-6">
          <h1 className="text-display-1">
            <EmphasisTitle parts={copy.title} />
          </h1>
          <p className={`mt-5 md:mt-6 ${LEAD}`}>{copy.lead}</p>
          <p className="hero-fact">
            {factBefore}
            <strong className="font-semibold text-fg">{diagnosticPrice}</strong>
            {factAfter}
          </p>
          <div className="hero-actions">
            <CtaLink
              cta="hero"
              href={navHref(locale, CTA_TARGET)}
              className={PRIMARY_BUTTON_FULL}
            >
              <span aria-hidden="true" className="icon icon-calendar size-5" />
              {copy.primary}
            </CtaLink>
            <CtaLink
              cta="hero_pricing"
              href={pagePath(locale, 'pricing')}
              className={`${SECONDARY_BUTTON} max-sm:hidden`}
            >
              {copy.secondary}
            </CtaLink>
          </div>
          <p className="hero-audience">{copy.audience}</p>
        </div>
        <div className="lg:col-span-7 lg:pl-4">
          <AgentDesk copy={desk} locale={locale} founder={founder} />
        </div>
      </Container>
    </section>
  );
}
