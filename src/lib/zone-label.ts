import { BOOKING_TIME_ZONES, type BookingZone } from '@/content/booking-rules';
import type { BookPageContent } from '@/content/types';

export function curatedZone(zone: string): BookingZone | undefined {
  return BOOKING_TIME_ZONES.find((candidate) => candidate === zone);
}

export function zoneLabel(copy: BookPageContent['zone'], zone: string): string {
  const known = curatedZone(zone);
  return known === undefined ? zone : copy.zones[known];
}
