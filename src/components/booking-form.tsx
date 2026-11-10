import { useHydrated } from '@tanstack/react-router';
import { createIsomorphicFn } from '@tanstack/react-start';
import {
  type ComponentProps,
  lazy,
  memo,
  Suspense,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { BookingAlert } from '@/components/booking-alert';
import { PanelBoundary } from '@/components/chat-launcher';
import {
  BookingDetailsFields,
  ConsentCheckbox,
  FormAlert,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { SlotPicker as ServerSlotPicker } from '@/components/slot-picker';
import { H3, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import type { BookPageContent } from '@/content/types';
import { bookAvailability } from '@/lib/book-availability';
import type { BookingCalendar } from '@/lib/booking-calendar';
import {
  type BookingRequest,
  type PageSlot,
  submitBooking,
} from '@/lib/booking-client';
import { type PageFailure, pageFailureOf } from '@/lib/booking-failure';
import { SURFACE_ACTION } from '@/lib/booking-surfaces';
import { text } from '@/lib/form-data';
import { type Locale, useMessages } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { PUBLIC_EMAIL } from '@/lib/site';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';
import { zoneLabel } from '@/lib/zone-label';

type Status = 'idle' | 'pending' | PageFailure;
type Held = { request: BookingRequest; label: string };

// The calendar maths and grid load in their own chunk in the browser. The
// server renders the grid in place (no streamed fallback, so it is in the
// HTML as sent), and the browser hydrates it once the chunk is in.
const LazySlotPicker = lazy(() =>
  import('@/components/slot-picker').then(({ SlotPicker }) => ({
    default: SlotPicker,
  })),
);

const slotPicker = createIsomorphicFn()
  .server(() => ServerSlotPicker)
  .client(() => LazySlotPicker);

// Memoised so the island gets no update before it has hydrated (one would
// throw the server HTML away for the empty fallback); a chunk that fails to
// load (offline, or an old page after a deploy) leaves the mail address.
const PickerIsland = memo(function PickerIsland({
  failText,
  ...props
}: ComponentProps<typeof ServerSlotPicker> & { failText: string }) {
  const Picker = slotPicker();
  return (
    <PanelBoundary fallback={<FormAlert alertRef={null}>{failText}</FormAlert>}>
      <Suspense fallback={null}>
        <Picker {...props} />
      </Suspense>
    </PanelBoundary>
  );
});

const PagePending = lazy(() =>
  import('@/components/page-pending').then(({ PagePending }) => ({
    default: PagePending,
  })),
);

export function BookingForm({
  copy,
  locale,
  zone,
  serverZone,
  slots: initialSlots,
  calendar: initialCalendar,
  preselect = null,
}: {
  copy: BookPageContent;
  locale: Locale;
  zone: string;
  // The zone the server rendered with, which the calendar keeps until it has
  // hydrated (the browser's own zone arrives right after the page's).
  serverZone: string;
  slots: readonly PageSlot[];
  calendar: BookingCalendar;
  preselect?: number | null;
}) {
  const hydrated = useHydrated();
  const [{ slots, calendar }, setList] = useState({
    slots: initialSlots,
    calendar: initialCalendar,
  });
  const { contact } = useMessages();
  const [status, setStatus] = useState<Status>('idle');
  const challenge = useChallenge((waited) => {
    if (waited) fail('captcha');
    else setStatus('captcha');
  });
  const [held, setHeld] = useState<Held | null>(null);
  const [chosen, setChosen] = useState(preselect);
  const [missing, setMissing] = useState(false);
  // The calendar's root, set once it is in the page (hydrated or drawn).
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const ready = root !== null;
  const alert = useRef<HTMLParagraphElement>(null);
  const strip = useRef<HTMLFieldSetElement>(null);
  const pending = status === 'pending';
  const { form } = copy;
  // Only a time still in the (possibly refreshed) list counts as chosen.
  const picked = slots.some((slot) => slot.start === chosen) ? chosen : null;
  const [noscriptBefore, noscriptAfter] = form.noscript.split('{email}');

  function fail(next: PageFailure) {
    flushSync(() => setStatus(next));
    alert.current?.focus();
  }

  const onSubmit = challenge.onSubmit(
    (data, token) => {
      void request(data, token);
    },
    (data) => {
      if (text(data, 'slot') === '') {
        flushSync(() => setMissing(true));
        strip.current
          ?.querySelector<HTMLInputElement>('[data-day]:not([hidden]) input')
          ?.focus();
        return false;
      }
      setStatus('idle');
      return true;
    },
  );

  async function request(data: FormData, token: string) {
    const slot = text(data, 'slot');
    setStatus('pending');
    const request: BookingRequest = {
      slot,
      name: text(data, 'name'),
      email: text(data, 'email'),
      company: text(data, 'company') || undefined,
      topic: text(data, 'topic'),
      timeZone: zone,
      locale,
      consent: true,
      turnstileToken: token,
      website: text(data, 'website'),
      attribution: await attribution(),
      surface: 'page',
    };
    const outcome = await submitBooking(request);
    challenge.retry();
    if (outcome.kind === 'pending') {
      setHeld({ request, label: formatSlotLabel(locale, outcome.start, zone) });
      setStatus('idle');
      track('book_request');
      return;
    }
    const failure = pageFailureOf(outcome);
    fail(failure);
    if (failure === 'taken' || failure === 'dayFull') {
      // Keep the typed details and the old list if the refresh itself fails.
      const fresh = await bookAvailability();
      if (fresh.status === 'ok') setList(fresh);
    }
  }

  if (held) {
    return (
      <Suspense fallback={null}>
        <PagePending
          copy={copy}
          locale={locale}
          request={held.request}
          label={held.label}
        />
      </Suspense>
    );
  }

  const when = picked === null ? null : formatSlotLabel(locale, picked, zone);
  return (
    <form
      aria-label={form.label}
      onSubmit={onSubmit}
      onFocus={challenge.engage}
      className="grid gap-8"
    >
      <fieldset
        disabled={!hydrated || pending || challenge.busy}
        className="grid min-w-0 gap-6"
      >
        <legend className="sr-only">{copy.picker.legend}</legend>
        {/* Only the calendar waits for its chunk; the details work at once. */}
        <fieldset ref={strip} disabled={!ready} className="min-w-0">
          <PickerIsland
            slots={slots}
            calendar={calendar}
            zone={ready ? zone : serverZone}
            locale={locale}
            copy={copy.picker}
            picked={picked}
            onPick={setChosen}
            rootRef={setRoot}
            failText={copy.unavailable.text}
          />
        </fieldset>
        <div className="booking-when">
          <span aria-hidden="true" className="icon icon-calendar" />
          <p aria-live="polite">
            <span className="block text-ui-s text-fg-soft">
              {copy.picker.chosen}
            </span>
            <span className="block font-semibold">
              {when ?? copy.picker.none}
            </span>
            {when === null ? null : (
              <span className="block text-ui-s text-fg-soft">
                {copy.zone.legend.replace('{zone}', zoneLabel(copy.zone, zone))}
              </span>
            )}
          </p>
        </div>
        {/* "Pick a time first" goes once a time is picked. */}
        {missing && picked === null ? (
          <p role="alert" className="chat-alert mt-0">
            {copy.picker.required}
          </p>
        ) : null}
        <h2 className={`mt-2 border-t border-hairline pt-6 ${H3}`}>
          {form.details}
        </h2>
        <BookingDetailsFields
          labels={{
            name: form.name,
            email: form.email,
            company: form.company,
            topic: form.topic,
          }}
          topicRows={4}
        />
        <Honeypot label={form.honeypot} />
        <ConsentCheckbox
          locale={locale}
          template={form.consent}
          linkText={form.consentLink}
        />
        <LazyTurnstile
          action={SURFACE_ACTION.page}
          locale={locale}
          {...challenge.widgetProps}
        />
        <button
          type="submit"
          aria-busy={pending || challenge.busy}
          className={`${PRIMARY_BUTTON} w-full sm:w-fit`}
        >
          {challenge.submitLabel(pending, {
            idle: form.submit,
            pending: form.sending,
            verifying: contact.form.verifying,
          })}
        </button>
        <p role="status" className="sr-only">
          {challenge.busy ? contact.form.verifying : ''}
        </p>
        <BookingAlert
          copy={copy}
          failure={status === 'idle' || status === 'pending' ? null : status}
          alert={alert}
        />
      </fieldset>
      <noscript>
        <p>
          {noscriptBefore}
          <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
            {PUBLIC_EMAIL}
          </a>
          {noscriptAfter}
        </p>
      </noscript>
    </form>
  );
}
