import type { MouseEvent } from 'react';
import { CtaLink } from '@/components/cta-link';
import { SlotChips } from '@/components/slot-chips';
import type { ChatCopy } from '@/content/types';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { isPlainClick } from '@/lib/plain-click';
import { chipsOf, type SlotChip, zoneName } from '@/lib/slot-chip';
import { formatDayParts } from '@/lib/slot-format';
import { groupByDay } from '@/lib/slots';

// The times check_availability returned this turn, as the desk's chips, one
// row per day. A plain click opens the booking card here; any other click (or
// no JavaScript in a copied link) opens /book with the time preselected.
export function ChatSlots({
  copy,
  locale,
  zone,
  starts,
  onPick,
  onOpen,
}: {
  copy: ChatCopy;
  locale: Locale;
  zone: string;
  starts: readonly number[];
  onPick: (start: number) => void;
  // Opens a page inside the app (the conversation stays), as navigate does.
  onOpen: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const days = groupByDay(
    starts.map((start) => ({ start, end: start })),
    zone,
  );
  const timesIn = copy.slots.timesIn.replace(
    '{zone}',
    zoneName(copy.zones, zone),
  );
  function pick(chip: SlotChip, event: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onPick(chip.start);
  }
  return (
    <div className="chat-slots" data-chat-slots>
      {days.map(({ date, entries }) => {
        const first = entries[0];
        if (first === undefined) return null;
        const day = formatDayParts(locale, first.parts);
        const chips = chipsOf(locale, day, entries);
        return (
          <div key={date} className="grid gap-2">
            <p className="text-ui-s text-fg-soft">
              <span className="font-semibold text-fg">{day}</span> · {timesIn}
            </p>
            <SlotChips
              chips={chips}
              locale={locale}
              group={`${copy.slots.group}: ${day}`}
              cta="chat_slot"
              onPick={pick}
            />
          </div>
        );
      })}
      <CtaLink
        cta="chat_times"
        href={pagePath(locale, 'book')}
        className="chat-more"
        onClick={(event) => onOpen(pagePath(locale, 'book'), event)}
      >
        {copy.slots.seeAll}
        <span aria-hidden="true" className="icon icon-arrow" />
      </CtaLink>
    </div>
  );
}
