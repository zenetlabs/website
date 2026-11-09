import { SlotChips } from '@/components/slot-chips';
import { fetchAvailability, type PageAvailability } from '@/lib/booking-client';
import { visitorZone } from '@/lib/browser-zone';
import type { Locale } from '@/lib/i18n';
import { chipsOf, type SlotChip, zoneName } from '@/lib/slot-chip';
import { formatDayParts } from '@/lib/slot-format';
import { groupByDay } from '@/lib/slots';
import { MINUTE_MS } from '@/lib/time';

// Loaded after `load` and idle by the home desk: the fetch, the slot maths and
// the zone names never ride in the first JavaScript.

export const SHOWN_SLOTS = 3;

// The chips component rides with the times, so the desk draws the same
// lazily loaded chips as the contact page and the chat.
export type ReadySlots = {
  status: 'ready';
  day: string;
  zone: string;
  chips: readonly SlotChip[];
  Chips: typeof SlotChips;
};

const ZONE_NAMES = {
  en: () => import('@/content/en/zone-names').then((m) => m.zoneNames),
  es: () => import('@/content/es/zone-names').then((m) => m.zoneNames),
};

// One fetch for the desk, the close card and the contact card, reused for five
// minutes across client-side navigation.
const FRESH_MS = 5 * MINUTE_MS;
let cached: { at: number; slots: Promise<PageAvailability> } | null = null;

export function loadAvailability(): Promise<PageAvailability> {
  if (cached === null || Date.now() - cached.at >= FRESH_MS) {
    cached = { at: Date.now(), slots: fetchAvailability() };
  }
  return cached.slots;
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
  const day = formatDayParts(locale, head.parts);
  return {
    status: 'ready',
    day,
    zone: zoneName(names, zone),
    chips: chipsOf(locale, day, first.entries.slice(0, SHOWN_SLOTS)),
    Chips: SlotChips,
  };
}
