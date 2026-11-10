import { useHydrated } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  CONTROL,
  ConsentCheckbox,
  Field,
  FormAlert,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { BAND_CARD, H3, PRIMARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import { getChatSessionId } from '@/lib/chat-session';
import { CONTACT_MESSAGE_MAX } from '@/lib/contact-message';
import { text } from '@/lib/form-data';
import { useLocale, useMessages } from '@/lib/i18n';
import { attribution, submitLead } from '@/lib/lead-client';
import type { LeadError } from '@/lib/lead-result';
import { type LeadMethod, track } from '@/lib/track';

type FailStatus = 'errorSend' | 'errorCaptcha' | 'errorRate';
type Status = 'idle' | 'pending' | 'sent' | FailStatus;

function failureFor(error: LeadError): FailStatus {
  if (error === 'captcha') return 'errorCaptcha';
  return error === 'rate' ? 'errorRate' : 'errorSend';
}

function linkedChat(): { chatSessionId?: string } {
  const chatSessionId = getChatSessionId();
  return chatSessionId === null ? {} : { chatSessionId };
}

export type ContactPrefill = { message: string; method: LeadMethod };

export function ContactForm({ prefill }: { prefill?: ContactPrefill }) {
  const { contact } = useMessages();
  const { form: copy } = contact;
  const locale = useLocale();
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>('idle');
  const challenge = useChallenge((waited) => {
    if (waited) fail('errorCaptcha');
    else setStatus('errorCaptcha');
  });
  const successHeading = useRef<HTMLParagraphElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const pending = status === 'pending';

  function fail(next: FailStatus) {
    flushSync(() => setStatus(next));
    challenge.retry();
    alert.current?.focus();
  }

  function succeed() {
    flushSync(() => setStatus('sent'));
    successHeading.current?.focus();
  }

  const onSubmit = challenge.onSubmit(
    (data, token) => {
      void send(data, token);
    },
    () => {
      setStatus('idle');
      return true;
    },
  );

  async function send(data: FormData, token: string) {
    setStatus('pending');
    try {
      const result = await submitLead({
        source: 'form',
        locale,
        name: text(data, 'name'),
        email: text(data, 'email'),
        company: text(data, 'company') || undefined,
        message: text(data, 'message'),
        consent: true,
        turnstileToken: token,
        website: text(data, 'website'),
        attribution: await attribution(),
        ...linkedChat(),
      });
      if (result.ok) {
        track('generate_lead', { method: prefill?.method ?? 'form' });
        succeed();
      } else fail(failureFor(result.error));
    } catch {
      fail('errorSend');
    }
  }

  return (
    <div className={BAND_CARD}>
      <div aria-live="polite">
        {status === 'sent' ? (
          <div className="grid gap-3 py-6">
            <p
              ref={successHeading}
              tabIndex={-1}
              className={`${H3} outline-hidden`}
            >
              {copy.successTitle}
            </p>
            <p className="text-fg-soft">{copy.successText}</p>
          </div>
        ) : null}
      </div>
      {status === 'sent' ? null : (
        <form
          aria-label={copy.label}
          onSubmit={onSubmit}
          onFocus={challenge.engage}
        >
          <fieldset
            disabled={!hydrated || pending || challenge.busy}
            className="grid gap-5"
          >
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
            <Field label={copy.message}>
              {(id) => (
                <textarea
                  id={id}
                  name="message"
                  defaultValue={prefill?.message}
                  required
                  minLength={10}
                  maxLength={CONTACT_MESSAGE_MAX}
                  rows={5}
                  className={`${CONTROL} resize-y`}
                />
              )}
            </Field>
            <Honeypot label={copy.honeypot} />
            <ConsentCheckbox
              locale={locale}
              template={copy.consent}
              linkText={copy.consentLink}
            />
            <LazyTurnstile
              action="lead"
              locale={locale}
              {...challenge.widgetProps}
            />
            <button
              type="submit"
              aria-busy={pending || challenge.busy}
              className={`${PRIMARY_BUTTON} w-full sm:w-fit`}
            >
              {challenge.submitLabel(pending, {
                idle: copy.submit,
                pending: copy.sending,
                verifying: copy.verifying,
              })}
            </button>
            <p role="status" className="sr-only">
              {challenge.busy ? copy.verifying : ''}
            </p>
            {status === 'errorSend' ||
            status === 'errorCaptcha' ||
            status === 'errorRate' ? (
              <FormAlert alertRef={alert}>{copy[status]}</FormAlert>
            ) : null}
          </fieldset>
        </form>
      )}
    </div>
  );
}
