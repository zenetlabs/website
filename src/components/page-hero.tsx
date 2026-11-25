import type { ReactNode } from 'react';
import { CtaLink } from '@/components/cta-link';
import { Container, EmphasisTitle } from '@/components/section';
import { sectionFrame } from '@/components/section-frame';
import { LEAD, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { TitleParts } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { CTA_TARGET, navHref } from '@/lib/nav';
import { pagePath } from '@/lib/page-registry';

const TINT = sectionFrame('tint');

// The hero of a service or landing page, on the tint ground: the title, one
// sentence and the actions on the left; the stage (the board, then the price
// ticket) on the right and, from `lg`, what is included under the copy,
// beside the ticket. The actions end with the link to the pricing page.
export function PageHero({
  breadcrumb,
  title,
  lead,
  button,
  pricing,
  board,
  ticket,
  includes,
  locale,
}: {
  breadcrumb?: ReactNode;
  title: TitleParts;
  lead: string;
  button: string;
  pricing: string;
  board?: ReactNode;
  ticket: ReactNode;
  includes: ReactNode;
  locale: Locale;
}) {
  return (
    <section
      aria-labelledby="page-title"
      data-ground={TINT.ground}
      className={TINT.bg}
    >
      <Container className="inner-hero">
        <div className="inner-hero-copy">
          {breadcrumb}
          <h1 id="page-title" className={breadcrumb ? 'mt-6 md:mt-8' : ''}>
            <EmphasisTitle parts={title} />
          </h1>
          <p className={`mt-4 md:mt-6 ${LEAD}`}>{lead}</p>
          <div className="page-hero-actions">
            <CtaLink
              cta="page_hero"
              href={navHref(locale, CTA_TARGET)}
              className={PRIMARY_BUTTON}
            >
              {button}
            </CtaLink>
            <a
              href={pagePath(locale, 'pricing')}
              className={`font-medium ${TEXT_LINK}`}
            >
              {pricing}
            </a>
          </div>
        </div>
        <div className="inner-hero-stage">
          {board}
          {ticket}
        </div>
        <div className="inner-hero-aside">{includes}</div>
      </Container>
    </section>
  );
}
