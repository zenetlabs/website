import { useHydrated } from '@tanstack/react-router';
import { type FormEvent, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  BookingDetailsFields,
  BookingSuccess,
  ConsentCheckbox,
  FormAlert,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { SlotPicker } from '@/components/slot-picker';
import { PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import type { BookPageContent } from '@/content/types';
import {
  type BookingOutcome,
  fetchAvailability,
  type PageSlot,
  submitBooking,
} from '@/lib/booking-client';
import { text } from '@/lib/form-data';
import type { Locale } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { PUBLIC_EMAIL } from '@/lib/site';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';
import { zoneLabel } from '@/lib/zone-label';

type Failure = keyof BookPageContent['errors'];
type Status = 'idle' | 'pending' | Failure;
type Confirmed = {
  when: string;
  zone: string;
  email: string;
  meetUrl: string | null;
};

function failureFor(outcome: Exclude<BookingOutcome, { kind: 'booked' }>) {
  if (outcome.kind === 'rejected') {
    if (outcome.reason === 'limit') return 'limit';
    return outcome.reason === 'day_full' ? 'dayFull' : 'taken';
  }
  if (outcome.error === 'captcha') return 'captcha';
  return outcome.error === 'rate' ? 'rate' : 'send';
}

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
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const pending = status === 'pending';
  const { form } = copy;
  const [noscriptBefore, noscriptAfter] = form.noscript.split('{email}');

  function fail(next: Failure) {
    flushSync(() => setStatus(next));
    challenge.retry();
    alert.current?.focus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const slot = text(data, 'slot');
    if (slot === '') return;
    setStatus('pending');
    const email = text(data, 'email');
    const outcome = await submitBooking({
      slot,
      name: text(data, 'name'),
      email,
      company: text(data, 'company') || undefined,
      topic: text(data, 'topic'),
      timeZone: zone,
      locale,
      consent: true,
      turnstileToken: token,
      website: text(data, 'website'),
      attribution: await attribution(),
    });
    if (outcome.kind === 'booked') {
      flushSync(() => {
        setConfirmed({
          when: formatSlotLabel(locale, outcome.start, zone),
          zone: zoneLabel(copy.zone, zone),
          email,
          meetUrl: outcome.meetUrl,
        });
        setStatus('idle');
      });
      successHeading.current?.focus();
      track('book_meeting');
      track('generate_lead', { method: 'booking' });
      return;
    }
    const failure = failureFor(outcome);
    fail(failure);
    if (failure === 'taken' || failure === 'dayFull') {
      // Keep the typed details and the old list if the refresh itself fails.
      const fresh = await fetchAvailability();
      if (fresh.status === 'ok') setSlots(fresh.slots);
    }
  }

  if (confirmed) {
    return (
      <div className="grid gap-4 rounded-card border border-border bg-surface p-6 md:p-8">
        <BookingSuccess
          headingRef={successHeading}
          headingClass="text-3xl"
          title={copy.success.title}
          when={copy.success.when
            .replace('{time}', confirmed.when)
            .replace('{zone}', confirmed.zone)}
          text={copy.success.text.replace('{email}', confirmed.email)}
          meetUrl={confirmed.meetUrl}
          meet={copy.success.meet}
          meetLater={copy.success.meetLater}
        />
      </div>
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
        <legend className="mb-3 text-2xl font-display leading-tight">
          {copy.picker.legend}
          <span className="mt-1 block font-sans text-sm font-normal text-muted-fg">
            {copy.zone.legend.replace('{zone}', zoneLabel(copy.zone, zone))}
          </span>
        </legend>
        <SlotPicker
          slots={slots}
          zone={zone}
          locale={locale}
          copy={copy.picker}
        />
        <p className="text-sm font-medium">{form.details}</p>
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
          action="book"
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
        {status === 'idle' || status === 'pending' ? null : status ===
          'taken' ? (
          <p
            ref={alert}
            role="alert"
            tabIndex={-1}
            className="text-sm outline-hidden"
          >
            {copy.errors[status]}
          </p>
        ) : (
          <FormAlert alertRef={alert}>{copy.errors[status]}</FormAlert>
        )}
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
