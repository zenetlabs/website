import { useHydrated } from '@tanstack/react-router';
import { type FormEvent, lazy, Suspense, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookingAlert } from '@/components/booking-alert';
import {
  BookingDetailsFields,
  ConsentCheckbox,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { SlotPicker } from '@/components/slot-picker';
import { H3, PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import type { BookPageContent } from '@/content/types';
import {
  type BookingRequest,
  fetchAvailability,
  type PageSlot,
  submitBooking,
} from '@/lib/booking-client';
import { type PageFailure, pageFailureOf } from '@/lib/booking-failure';
import { SURFACE_ACTION } from '@/lib/booking-surfaces';
import { text } from '@/lib/form-data';
import type { Locale } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { PUBLIC_EMAIL } from '@/lib/site';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';
import { zoneLabel } from '@/lib/zone-label';

type Status = 'idle' | 'pending' | PageFailure;
type Held = { request: BookingRequest; label: string };

const PagePending = lazy(() =>
  import('@/components/page-pending').then(({ PagePending }) => ({
    default: PagePending,
  })),
);

export function BookingForm({
  copy,
  locale,
  zone,
  slots: initialSlots,
}: {
  copy: BookPageContent;
  locale: Locale;
  zone: string;
  slots: readonly PageSlot[];
}) {
  const hydrated = useHydrated();
  const [slots, setSlots] = useState(initialSlots);
  const challenge = useChallenge();
  const { token } = challenge;
  const [status, setStatus] = useState<Status>('idle');
  const [held, setHeld] = useState<Held | null>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const pending = status === 'pending';
  const { form } = copy;
  const [noscriptBefore, noscriptAfter] = form.noscript.split('{email}');

  function fail(next: PageFailure) {
    flushSync(() => setStatus(next));
    alert.current?.focus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const slot = text(data, 'slot');
    if (slot === '') return;
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
      const fresh = await fetchAvailability();
      if (fresh.status === 'ok') setSlots(fresh.slots);
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

  return (
    <form
      aria-label={form.label}
      onSubmit={onSubmit}
      onFocus={challenge.engage}
      className="grid gap-8"
    >
      <fieldset disabled={!hydrated || pending} className="grid gap-5">
        <legend className={`mb-3 ${H3}`}>
          {copy.picker.legend}
          <span className="mt-1 block font-sans text-ui-s font-normal text-muted-fg">
            {copy.zone.legend.replace('{zone}', zoneLabel(copy.zone, zone))}
          </span>
        </legend>
        <SlotPicker
          slots={slots}
          zone={zone}
          locale={locale}
          copy={copy.picker}
        />
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
          engaged={challenge.engaged}
          action={SURFACE_ACTION.page}
          locale={locale}
          instance={challenge.instance}
          onToken={challenge.setToken}
          onError={() => {
            challenge.setToken('');
            setStatus('captcha');
          }}
        />
        <button
          type="submit"
          disabled={token === ''}
          className={`${PRIMARY_BUTTON} w-full sm:w-fit`}
        >
          {pending ? form.sending : form.submit}
        </button>
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
