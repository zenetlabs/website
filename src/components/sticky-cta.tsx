import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { PRIMARY_BUTTON_FULL } from '@/components/ui';
import { type Locale, useMessages } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';

export function StickyZone({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const { nav } = useMessages();

  return (
    <div>
      {children}
      <div data-sticky-cta className="sticky-cta">
        <CtaLink
          cta="sticky"
          href={navHref(locale, CTA_TARGET)}
          className={`${PRIMARY_BUTTON_FULL} flex-1`}
        >
          {nav.cta}
        </CtaLink>
      </div>
    </div>
  );
}
