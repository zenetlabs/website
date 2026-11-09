import type { MouseEvent } from 'react';
import { CtaLink } from '@/components/cta-link';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { type SlotChip, slotHref } from '@/lib/slot-chip';
import type { CtaId } from '@/lib/track';

// The free times as chips: the home desk and close, the contact page and the
// chat's replies draw the same ones. Loaded lazily everywhere (never in the
// first JavaScript), so the desk, contact and chat share one chunk.
export function SlotChips({
  chips,
  locale,
  group,
  seeAll = null,
  cta = 'desk_slot',
  seeAllCta = 'desk_times',
  onPick,
}: {
  chips: readonly SlotChip[];
  locale: Locale;
  group: string;
  // "See all times", beside the chips from `sm`; absent in a chat reply.
  seeAll?: string | null;
  cta?: CtaId;
  seeAllCta?: CtaId;
  onPick?: (chip: SlotChip, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const row = (
    <ul aria-label={group} className="slot-row">
      {chips.map((chip) => (
        <li key={chip.start} className="grid">
          <CtaLink
            cta={cta}
            href={slotHref(locale, chip.start)}
            className="slot-chip"
            label={chip.label}
            onClick={onPick ? (event) => onPick(chip, event) : undefined}
          >
            {chip.time}
          </CtaLink>
        </li>
      ))}
    </ul>
  );
  if (seeAll === null) return row;
  return (
    <div className="slot-ready">
      {row}
      <CtaLink
        cta={seeAllCta}
        href={pagePath(locale, 'book')}
        className="slot-more"
      >
        {seeAll}
        <span aria-hidden="true" className="icon icon-arrow" />
      </CtaLink>
    </div>
  );
}
