import { CtaSection } from '@/components/cta-section';
import { EmphasisTitle } from '@/components/section';
import { EYEBROW, H3, LEAD, TEXT_LINK } from '@/components/ui';
import type { Card, PageCta, TitleParts } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { type PageId, pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL } from '@/lib/site';

// The blocks of the pages that do not use the inner hero (the case page, the
// booking page, the calculator): kept out of page-blocks, which the service
// and landing pages load before they hydrate.
export function HeroHeading({
  title,
  lead,
  afterBreadcrumb = false,
}: {
  title: TitleParts;
  lead: string;
  afterBreadcrumb?: boolean;
}) {
  const top = afterBreadcrumb ? 'mt-6 md:mt-10 ' : '';
  return (
    <>
      <h1 id="page-title" className={`${top}max-w-4xl`}>
        <EmphasisTitle parts={title} />
      </h1>
      <p className={`mt-4 md:mt-6 ${LEAD}`}>{lead}</p>
    </>
  );
}

type Fact = {
  id: string;
  label: string;
  value: string;
};

export function FactList({ facts }: { facts: readonly Fact[] }) {
  return (
    <dl className="facts">
      {facts.map((fact) => (
        <div key={fact.id}>
          <dt className={EYEBROW}>{fact.label}</dt>
          <dd className="fact-value">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GetStarted({
  locale,
  cta,
  mail,
}: {
  locale: Locale;
  cta: PageCta;
  mail: string;
}) {
  return (
    <CtaSection
      cta="page_cta"
      copy={cta}
      locale={locale}
      footer={
        <p className="mt-8 text-fg-soft">
          {mail}{' '}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
        </p>
      }
    />
  );
}

export function UseCaseList({
  items,
  locale,
}: {
  items: readonly (Card & { page?: PageId })[];
  locale: Locale;
}) {
  return (
    <ul className="usecase-list">
      {items.map((item) => (
        <li key={item.id}>
          <h3 className={H3}>
            {item.page ? (
              <a href={pagePath(locale, item.page)} className={TEXT_LINK}>
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h3>
          <p className="mt-2 text-ui-m text-fg-soft md:mt-3 md:text-base">
            {item.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
