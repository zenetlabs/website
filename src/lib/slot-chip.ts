import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { formatTimeParts } from '@/lib/slot-format';
import type { Interval, ZonedSlot } from '@/lib/slots';

export type SlotChip = { start: number; time: string; label: string };

// A slot chip's link: /book with the slot preselected.
export function slotHref(locale: Locale, start: number): string {
  return `${pagePath(locale, 'book')}?slot=${start}`;
}

// One day's times as chips: the time on the chip, the day and time read aloud.
export function chipsOf(
  locale: Locale,
  day: string,
  entries: readonly ZonedSlot<Interval>[],
): SlotChip[] {
  return entries.map(({ slot, parts }) => {
    const time = formatTimeParts(locale, parts);
    return { start: slot.start, time, label: `${day}, ${time}` };
  });
}

// The zone's curated name from `names`, else its city as the zone names it.
// (Looked up in `names`, not via zone-label: a lazy import of zone-label
// splits it from browser-zone and adds a chunk to /book's first JavaScript.)
export function zoneName(
  names: Readonly<Record<string, string>>,
  zone: string,
) {
  const known = Object.entries(names).find(([key]) => key === zone)?.[1];
  return known ?? (zone.split('/').at(-1) ?? zone).replaceAll('_', ' ');
}
