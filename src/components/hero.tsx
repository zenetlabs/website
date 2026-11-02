import { CtaLink } from '@/components/cta-link';
import { ProofPanel } from '@/components/proof-panel';
import { Container, EmphasisTitle } from '@/components/section';
import { LEAD, PRIMARY_BUTTON_LG, TEXT_LINK } from '@/components/ui';
import type { HomeContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

export function Hero({
  copy,
  proof,
  diagnosticPrice,
  locale,
}: {
  copy: HomeContent['hero'];
  proof: HomeContent['proof'];
  diagnosticPrice: string;
  locale: Locale;
}) {
  return (
    <section data-ground="paper">
      <Container className="grid gap-12 py-12 md:py-20 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="lg:col-span-7">
          <h1 className="text-display-1">
            <EmphasisTitle parts={copy.title} marker />
          </h1>
          <p className={`mt-6 ${LEAD}`}>{copy.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
            <CtaLink
              cta="hero"
              href={navHref(locale, CTA_TARGET)}
              className={PRIMARY_BUTTON_LG}
            >
              {copy.primary}
            </CtaLink>
            <CtaLink
              cta="hero_pricing"
              href={pagePath(locale, 'pricing')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {copy.secondary} →
            </CtaLink>
          </div>
          <p className="mt-6 text-ui-s text-muted-fg">
            {copy.audience} · {copy.diagnostic}{' '}
            <span className="font-mono tabular-nums">{diagnosticPrice}</span>
          </p>
        </div>
        <div className="lg:col-span-5">
          <ProofPanel copy={proof} />
        </div>
      </Container>
    </section>
  );
}
