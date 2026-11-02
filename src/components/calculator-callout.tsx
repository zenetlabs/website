import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { TEXT_LINK } from '@/components/ui';
import type { PricingPageContent } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { isPublished, pagePath, type SiteFlags } from '@/lib/page-registry';
import { SITE } from '@/lib/site';

export function CalculatorCallout({
  copy,
  locale,
  site = SITE,
}: {
  copy: PricingPageContent['calculator'];
  locale: Locale;
  site?: SiteFlags;
}) {
  if (!isPublished('calculator', site)) return null;
  const { ground, bg } = sectionFrame('tint');
  return (
    <section
      aria-labelledby="calculator-callout-title"
      data-ground={ground}
      className={bg}
    >
      <Container className="py-section-compact flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-12">
        <div>
          <h2 id="calculator-callout-title" className="text-h2-compact">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-[60ch] text-fg-soft">{copy.text}</p>
        </div>
        <a
          href={pagePath(locale, 'calculator')}
          className={`shrink-0 font-medium ${TEXT_LINK}`}
        >
          {copy.link} →
        </a>
      </Container>
    </section>
  );
}
