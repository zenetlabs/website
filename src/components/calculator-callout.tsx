import { Container } from '@/components/section';
import { CARD, TEXT_LINK } from '@/components/ui';
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
  return (
    <Container className="pb-10">
      <div className={`${CARD} max-w-3xl p-8`}>
        <h2 className="text-2xl md:text-3xl">{copy.title}</h2>
        <p className="mt-3 text-muted-fg">{copy.text}</p>
        <a
          href={pagePath(locale, 'calculator')}
          className={`mt-5 inline-block font-medium ${TEXT_LINK}`}
        >
          {copy.link} →
        </a>
      </div>
    </Container>
  );
}
