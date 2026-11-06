import { DEFAULT_ZONE } from '@/content/booking-rules';
import type { Locale } from '@/lib/i18n';
import { canonicalZone } from '@/lib/slots';

// The visitor's own time zone as the browser reports it, when it is a real
// IANA zone. A string, so it is a stable `useSyncExternalStore` snapshot.
export function detectedZone(): string | null {
  return canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

// The zone to show times in when nothing else is asked for.
export function visitorZone(locale: Locale): string {
  return detectedZone() ?? DEFAULT_ZONE[locale];
}
