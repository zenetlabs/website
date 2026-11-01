import { type FormEvent, useId, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  CONTROL,
  ConsentCheckbox,
  Field,
  LazyTurnstile,
} from '@/components/form-parts';
import { PRIMARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import type { ChatCopy } from '@/content/types';
import { type BookingOutcome, submitBooking } from '@/lib/booking-client';
import type { Proposal } from '@/lib/chat-events';
import { text } from '@/lib/form-data';
import { type Locale, useMessages } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';

type Failure = 'taken' | 'error' | 'rate' | 'captcha';
type Status = 'idle' | 'pending' | Failure;

const SECONDARY_BUTTON =
  'inline-flex min-h-11 items-center justify-center rounded-input border border-border px-5 py-2.5 text-sm font-semibold motion-safe:transition-colors motion-safe:duration-200 hover:bg-surface';

function failureFor(
  outcome: Exclude<BookingOutcome, { kind: 'booked' }>,
): Failure {
  if (outcome.kind === 'rejected') {
    return outcome.reason === 'limit' ? 'error' : 'taken';
  }
  if (outcome.error === 'captcha') return 'captcha';
  return outcome.error === 'rate' ? 'rate' : 'error';
}

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
    flushSync(() => setStatus(failureFor(outcome)));
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
        <Field label={copy.name}>
          {(id) => (
            <input
              id={id}
              name="name"
              required
              maxLength={100}
              autoComplete="name"
              className={CONTROL}
            />
          )}
        </Field>
        <Field label={copy.email}>
          {(id) => (
            <input
              id={id}
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={CONTROL}
            />
          )}
        </Field>
        <Field label={copy.company}>
          {(id) => (
            <input
              id={id}
              name="company"
              maxLength={100}
              autoComplete="organization"
              className={CONTROL}
            />
          )}
        </Field>
        <Field label={copy.topic}>
          {(id) => (
            <textarea
              id={id}
              name="topic"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              defaultValue={proposal.topic}
              className={`${CONTROL} resize-y`}
            />
          )}
        </Field>
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
