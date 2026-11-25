import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { LEAD, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { TitleParts } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import type { PageId } from '@/lib/page-registry';

const TINT = sectionFrame('tint');

// The hero of an inner page, on the tint ground: the title, one sentence and
// the actions on the left; the stage on the right and, from `lg`, the aside
// under the copy, beside the stage. Each slot renders only when it is given.
export function PageHero({
  breadcrumb,
  title,
  lead,
  actions,
  stage,
  aside,
}: {
  breadcrumb?: ReactNode;
  title: TitleParts;
  lead: string;
  actions?: ReactNode;
  stage?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="page-title"
      data-ground={TINT.ground}
      data-stage={stage ? undefined : 'none'}
      className={TINT.bg}
    >
      <Container className="inner-hero">
        <div className="inner-hero-copy">
          {breadcrumb}
          <h1 id="page-title" className={breadcrumb ? 'mt-6 md:mt-8' : ''}>
            <EmphasisTitle parts={title} />
          </h1>
          <p className={`mt-4 md:mt-6 ${LEAD}`}>{lead}</p>
          {actions}
        </div>
        {stage ? <div className="inner-hero-stage">{stage}</div> : null}
        {aside ? <div className="inner-hero-aside">{aside}</div> : null}
      </Container>
    </section>
  );
}

// The booking CTA, then a secondary link (the pricing page on a service page).
export function HeroActions({
  button,
  secondary,
  locale,
}: {
  button: string;
  secondary: { label: string; page: PageId };
  locale: Locale;
}) {
  return (
    <div className="page-hero-actions">
      <CtaLink
        cta="page_hero"
        href={navHref(locale, CTA_TARGET)}
        className={PRIMARY_BUTTON}
      >
        {button}
      </CtaLink>
      <a
        href={navHref(locale, secondary)}
        className={`font-medium ${TEXT_LINK}`}
      >
        {secondary.label}
      </a>
    </div>
  );
}
