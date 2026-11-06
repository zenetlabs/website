import { fetchAvailability, type PageAvailability } from '@/lib/booking-client';
import { visitorZone } from '@/lib/browser-zone';
import type { Locale } from '@/lib/i18n';
import { formatDayParts, formatTimeParts } from '@/lib/slot-format';
import { groupByDay } from '@/lib/slots';
import { curatedZone } from '@/lib/zone-label';

// Loaded after `load` and idle by the home desk: the fetch, the slot maths and
// the zone names never ride in the first JavaScript.

export const SHOWN_SLOTS = 3;

export type SlotChip = { start: number; time: string; label: string };

export type ReadySlots = {
  status: 'ready';
  day: string;
  zone: string;
  chips: readonly SlotChip[];
};

const ZONE_NAMES = {
  en: () => import('@/content/en/zone-names').then((m) => m.zoneNames),
  es: () => import('@/content/es/zone-names').then((m) => m.zoneNames),
};

// A zone outside the curated list is shown by its city, as the browser names it.
function cityOf(zone: string): string {
  return (zone.split('/').at(-1) ?? zone).replaceAll('_', ' ');
}

export function loadAvailability(): Promise<PageAvailability> {
  return fetchAvailability();
}

// The first free day, and at most three of its times, in the visitor's zone.
export async function nextSlots(
  availability: PageAvailability,
  locale: Locale,
): Promise<ReadySlots | null> {
  if (availability.status !== 'ok') return null;
  const zone = visitorZone(locale);
  const first = groupByDay(availability.slots, zone)[0];
  const head = first?.entries[0];
  if (first === undefined || head === undefined) return null;
  const names = await ZONE_NAMES[locale]();
  const curated = curatedZone(zone);
  const day = formatDayParts(locale, head.parts);
  return {
    status: 'ready',
    day,
    zone: curated === undefined ? cityOf(zone) : names[curated],
    chips: first.entries.slice(0, SHOWN_SLOTS).map(({ slot, parts }) => {
      const time = formatTimeParts(locale, parts);
      return { start: slot.start, time, label: `${day}, ${time}` };
    }),
  };
}
