import { EmphasisTitle } from '@/components/section';
import { LEAD } from '@/components/ui';
import type { TitleParts } from '@/content/types';

// The opening of a page without a figure of its own: the H1 on 7 columns, the
// lead (and an optional note) on the other 5.
export function PageIntro({
  title,
  lead,
  note,
}: {
  title: TitleParts;
  lead: string;
  note?: string;
}) {
  return (
    <div className="offer-head">
      <h1 className="max-w-4xl lg:col-span-7">
        <EmphasisTitle parts={title} />
      </h1>
      <div className="lg:col-span-5 lg:justify-self-end">
        <p className={LEAD}>{lead}</p>
        {note ? <p className="mt-3 text-ui-s text-muted-fg">{note}</p> : null}
      </div>
    </div>
  );
}
