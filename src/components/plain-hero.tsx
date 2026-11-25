import { EmphasisTitle } from '@/components/section';
import { EYEBROW, LEAD } from '@/components/ui';
import type { TitleParts } from '@/content/types';

// The blocks of the booking page and the calculator, plus the case page's
// facts: kept out of page-blocks, which the service and landing pages load
// before they hydrate.
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
