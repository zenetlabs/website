import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BookingPending } from '@/components/booking-pending';
import { BookingPerson } from '@/components/booking-person';
import { BookingWhen } from '@/components/booking-when';
import {
  BookingDetailsFields,
  ConsentCheckbox,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import { useResend } from '@/components/use-resend';
import type { ChatCopy } from '@/content/types';
import { type BookingRequest, submitBooking } from '@/lib/booking-client';
import { type BookingFailureKind, failureOf } from '@/lib/booking-failure';
import { SURFACE_ACTION } from '@/lib/booking-surfaces';
import type { Proposal } from '@/lib/chat-events';
import { text } from '@/lib/form-data';
import { type Locale, useMessages } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';

type Status = 'idle' | 'pending' | BookingFailureKind;

export function BookingCard({
  proposal,
  copy,
  locale,
  zone,
  sessionId,
  onDone,
  onCancel,
}: {
  proposal: Proposal;
  copy: ChatCopy['booking'];
  locale: Locale;
  zone: string;
  sessionId: string | null;
  // The request is held and the visitor closed the card: the chat notes it.
  onDone: (when: string) => void;
  onCancel: () => void;
}) {
  const { contact } = useMessages();
  const challenge = useChallenge();
  const [status, setStatus] = useState<Status>('idle');
  const [held, setHeld] = useState<BookingRequest | null>(null);
  const again = useResend(challenge);
  const titleId = useId();
  const pendingHeading = useRef<HTMLHeadingElement>(null);
  const pending = status === 'pending';
  const when = formatSlotLabel(locale, Date.parse(proposal.slot), zone);

  const onSubmit = challenge.onSubmit(
    (data, token) => {
      void request(data, token);
    },
    () => {
      setStatus('idle');
      return true;
    },
  );

  async function request(data: FormData, token: string) {
    setStatus('pending');
    const request: BookingRequest = {
      slot: proposal.slot,
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
      surface: 'chat',
      ...(sessionId === null ? {} : { chatSessionId: sessionId }),
    };
    const outcome = await submitBooking(request);
    challenge.retry();
    if (outcome.kind === 'pending') {
      track('book_request');
      flushSync(() => {
        setHeld(request);
        setStatus('idle');
      });
      pendingHeading.current?.focus();
      return;
    }
    setStatus(failureOf(outcome));
  }

  async function onResend() {
    if (held === null) return;
    setStatus('idle');
    const failed = await again.resend(held);
    if (failed !== null) setStatus(failureOf(failed));
  }

  const turnstile = (
    <LazyTurnstile
      action={SURFACE_ACTION.chat}
      locale={locale}
      {...challenge.widgetProps(() => setStatus('captcha'))}
      engaged={challenge.engaged || held !== null}
    />
  );
  const alert =
    status === 'idle' || status === 'pending' ? null : (
      <p role="alert" className="chat-alert mt-0">
        {copy[status]}
      </p>
    );

  if (held) {
    return (
      <section
        aria-labelledby={titleId}
        data-booking-pending
        className="booking-card"
      >
        <BookingPending
          headingRef={pendingHeading}
          headingId={titleId}
          headingClass="text-ui-l font-semibold"
          copy={copy.pending}
          label={when}
          email={held.email}
          resend={again.status}
          canResend={challenge.token !== ''}
          onResend={onResend}
        >
          {turnstile}
          {alert}
        </BookingPending>
        <div>
          <button
            type="button"
            onClick={() => onDone(when)}
            className={SECONDARY_BUTTON}
          >
            {copy.close}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      aria-labelledby={titleId}
      onSubmit={onSubmit}
      onFocus={challenge.engage}
      className="booking-card"
    >
      <h3
        id={titleId}
        tabIndex={-1}
        ref={(heading) => heading?.focus()}
        className="text-ui-l font-semibold outline-hidden"
      >
        {copy.title}
      </h3>
      <BookingWhen label={copy.when} primary={when} secondary={copy.format} />
      <BookingPerson locale={locale} />
      <fieldset disabled={pending || challenge.busy} className="grid gap-4">
        <BookingDetailsFields
          labels={{
            name: copy.name,
            email: copy.email,
            company: copy.company,
            topic: copy.topic,
          }}
          defaults={{ topic: proposal.topic }}
          topicRows={3}
        />
        <Honeypot label={contact.form.honeypot} />
        <ConsentCheckbox
          locale={locale}
          template={contact.form.consent}
          linkText={contact.form.consentLink}
        />
        {turnstile}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            aria-busy={pending || challenge.busy}
            className={PRIMARY_BUTTON}
          >
            {challenge.submitLabel(pending, {
              idle: copy.confirm,
              pending: copy.sending,
              verifying: contact.form.verifying,
            })}
          </button>
          <p role="status" className="sr-only">
            {challenge.busy ? contact.form.verifying : ''}
          </p>
          <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
            {copy.cancel}
          </button>
        </div>
      </fieldset>
      {alert}
    </form>
  );
}
