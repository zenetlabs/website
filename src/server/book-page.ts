import '@tanstack/react-start/server-only';
import { getRequestUrl, setResponseHeader } from '@tanstack/react-start/server';
import type { PageAvailability } from '@/lib/booking-client';
import { isLiveHost } from '@/lib/redirects';
import { pageSlots } from '@/server/booking';
import { bookingDeps } from '@/server/tool-deps';

// A slow Google must not slow the page: past this the visitor gets the contact form.
const DEADLINE_MS = 1_500;

export function pageAvailability(): Promise<PageAvailability> {
  setResponseHeader('Cache-Control', 'private, no-store');
  return pageSlots(
    {
      deps: bookingDeps(),
      now: Date.now(),
      isTest: !isLiveHost(getRequestUrl().hostname),
    },
    DEADLINE_MS,
  );
}
