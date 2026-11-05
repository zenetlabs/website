import '@tanstack/react-start/server-only';
import { env } from 'cloudflare:workers';
import { getRequestUrl, setResponseHeader } from '@tanstack/react-start/server';
import type { PageAvailability } from '@/lib/booking-client';
import type { ConfirmView } from '@/lib/confirm-view';
import { isLiveHost } from '@/lib/redirects';
import { pageSlots } from '@/server/booking';
import { confirmView, PRIVATE_PAGE_HEADERS } from '@/server/booking-confirm';
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

// The page behind an emailed link: read only, never indexed, never cached,
// and a same-origin referrer only, since the token is in the URL.
export function pageConfirmation(
  token: string,
  outcome: string | null,
): Promise<ConfirmView> {
  for (const [name, value] of Object.entries(PRIVATE_PAGE_HEADERS)) {
    setResponseHeader(name, value);
  }
  return confirmView(env.DB, token, outcome, Date.now());
}
