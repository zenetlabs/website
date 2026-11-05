import { useEffect } from 'react';
import { H3, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import { DEFAULT_ZONE } from '@/content/booking-rules';
import type { BookingConfirmCopy, BookPageContent } from '@/content/types';
import type { ConfirmView } from '@/lib/confirm-view';
import type { Locale } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { formatSlotLabel, formatSlotTime } from '@/lib/slot-format';
import { trackBookingConfirm } from '@/lib/track';
import { zoneLabel } from '@/lib/zone-label';

// States where the visitor's next step is to pick a time again.
const PICK_AGAIN = new Set<ConfirmView['state']>([
  'expired',
  'taken',
  'failed',
  'cancelled',
  'invalid',
]);

// The conversions go once, on the page the Confirm post redirected to: the
// `booked` hint is dropped from the address, so a reload sends nothing.
function useBookedConversion(view: ConfirmView, outcome: string | null) {
  const booked = view.state === 'confirmed' && outcome === 'booked';
  const method = view.state === 'invalid' ? null : view.method;
  useEffect(() => {
    if (!booked || method === null) return;
    trackBookingConfirm(method);
    const url = new URL(window.location.href);
    url.searchParams.delete('outcome');
    window.history.replaceState(window.history.state, '', url);
  }, [booked, method]);
}

// The page behind the emailed link. Opening it changes nothing; only the
// button, a plain form post that works without JavaScript, books the call.
// It shows the slot and the masked address, never the visitor's own text.
export function BookingConfirm({
  confirm,
  zones,
  locale,
  token,
  view,
  outcome,
}: {
  confirm: BookingConfirmCopy;
  zones: BookPageContent['zone'];
  locale: Locale;
  token: string;
  view: ConfirmView;
  outcome: string | null;
}) {
  useBookedConversion(view, outcome);
  const entry = confirm.states[view.state];
  const pick = PICK_AGAIN.has(view.state) ? (
    <p>
      <a href={pagePath(locale, 'book')} className={TEXT_LINK}>
        {confirm.pick}
      </a>
    </p>
  ) : null;
  if (view.state === 'invalid') {
    return (
      <div className="grid gap-4" data-confirm-state="invalid">
        <h2 className={H3}>{entry.title}</h2>
        <p className="text-fg-soft">{entry.text}</p>
        {pick}
      </div>
    );
  }
  const zone = view.timeZone ?? DEFAULT_ZONE[locale];
  const label = formatSlotLabel(locale, view.start, zone);
  const zoneName = zoneLabel(zones, zone);
  const text = entry.text
    .replace('{label}', label)
    .replace('{zone}', zoneName)
    .replace('{masked}', view.masked)
    .replace('{time}', formatSlotTime(locale, view.expiresAt, zone));
  const askable = view.state === 'pending' || view.state === 'unavailable';
  return (
    <div className="grid gap-4" data-confirm-state={view.state}>
      <h2 className={H3}>{entry.title}</h2>
      {askable ? (
        <>
          <p className="font-medium">
            {confirm.slot.replace('{label}', label).replace('{zone}', zoneName)}
          </p>
          <p className="text-fg-soft">
            {confirm.for.replace('{masked}', view.masked)}
          </p>
        </>
      ) : null}
      {text === '' ? null : <p className="text-fg-soft">{text}</p>}
      {askable ? (
        <form method="post" action="/api/book/confirm" className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={`${PRIMARY_BUTTON} w-full sm:w-fit`}>
            {confirm.button}
          </button>
          <p className="text-ui-s text-muted-fg">{confirm.notYou}</p>
        </form>
      ) : null}
      {pick}
    </div>
  );
}
