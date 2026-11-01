import { type FormEvent, useId, useState } from 'react';
import {
  BookingDetailsFields,
  ConsentCheckbox,
  LazyTurnstile,
} from '@/components/form-parts';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import type { ChatCopy } from '@/content/types';
import { submitBooking } from '@/lib/booking-client';
import { type BookingFailureKind, failureOf } from '@/lib/booking-failure';
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
  onDone: (when: string) => void;
  onCancel: () => void;
}) {
  const { contact } = useMessages();
  const challenge = useChallenge();
  const [status, setStatus] = useState<Status>('idle');
  const titleId = useId();
  const pending = status === 'pending';
  const when = formatSlotLabel(locale, Date.parse(proposal.slot), zone);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('pending');
    const outcome = await submitBooking({
      slot: proposal.slot,
      name: text(data, 'name'),
      email: text(data, 'email'),
      company: text(data, 'company') || undefined,
      topic: text(data, 'topic'),
      timeZone: zone,
      locale,
      consent: true,
      turnstileToken: challenge.token,
      website: '',
      attribution: await attribution(),
      ...(sessionId === null ? {} : { chatSessionId: sessionId }),
    });
    if (outcome.kind === 'booked') {
      track('book_meeting');
      track('generate_lead', { method: 'chat' });
      onDone(formatSlotLabel(locale, outcome.start, zone));
      return;
    }
    setStatus(failureOf(outcome));
    challenge.retry();
  }

  return (
    <form
      aria-labelledby={titleId}
      onSubmit={onSubmit}
      onFocus={challenge.engage}
      className="grid gap-3 rounded-card border border-border bg-surface p-4"
    >
      <h3
        id={titleId}
        tabIndex={-1}
        ref={(heading) => heading?.focus()}
        className="text-base font-semibold outline-hidden"
      >
        {copy.title}
      </h3>
      <p className="text-sm">
        <span className="font-medium">{copy.when}: </span>
        {when} · {copy.format}
      </p>
      <fieldset disabled={pending} className="grid gap-3">
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
        <ConsentCheckbox
          locale={locale}
          template={contact.form.consent}
          linkText={contact.form.consentLink}
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
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={challenge.token === ''}
            className={PRIMARY_BUTTON}
          >
            {pending ? copy.sending : copy.confirm}
          </button>
          <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
            {copy.cancel}
          </button>
        </div>
      </fieldset>
      {status === 'idle' || status === 'pending' ? null : (
        <p role="alert" className="text-sm">
          {copy[status]}
        </p>
      )}
    </form>
  );
}
