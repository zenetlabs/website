import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { Container } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { LEAD, PRIMARY_BUTTON_LG, TEXT_LINK } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import type { CtaId } from '@/lib/track';

export function CtaSection({
  cta,
  copy,
  locale,
  secondary,
  footer,
}: {
  cta: CtaId;
  copy: { title: string; text: string; button: string };
  locale: Locale;
  secondary?: { label: string; href: string };
  footer?: ReactNode;
}) {
  const { ground, bg, pad } = sectionFrame('band');
  return (
    <section aria-labelledby="cta-title" data-ground={ground} className={bg}>
      <Container className={pad}>
        <h2 id="cta-title" className="max-w-3xl">
          {copy.title}
        </h2>
        <p className={`mt-5 ${LEAD}`}>{copy.text}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <CtaLink
            cta={cta}
            href={navHref(locale, CTA_TARGET)}
            className={PRIMARY_BUTTON_LG}
          >
            {copy.button}
          </CtaLink>
          {secondary ? (
            <a href={secondary.href} className={`font-medium ${TEXT_LINK}`}>
              {secondary.label} →
            </a>
          ) : null}
        </div>
        {footer}
      </Container>
    </section>
  );
}
