import { useHydrated } from '@tanstack/react-router';
import { type FormEvent, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  CONTROL,
  ConsentCheckbox,
  Field,
  FormAlert,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { PRIMARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import { getChatSessionId } from '@/lib/chat-session';
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
  const challenge = useChallenge();
  const { token } = challenge;
  const [status, setStatus] = useState<Status>('idle');
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
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
    <div className="rounded-card border border-border bg-surface p-6 md:p-8">
      <div aria-live="polite">
        {status === 'sent' ? (
          <div className="grid gap-3 py-6">
            <p
              ref={successHeading}
              tabIndex={-1}
              className="font-display text-3xl outline-hidden"
            >
              {copy.successTitle}
            </p>
            <p className="text-muted-fg">{copy.successText}</p>
          </div>
        ) : null}
      </div>
      {status === 'sent' ? null : (
        <form
          aria-label={copy.label}
          onSubmit={onSubmit}
          onFocus={challenge.engage}
        >
          <fieldset disabled={!hydrated || pending} className="grid gap-5">
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
                  maxLength={5000}
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
              engaged={challenge.engaged}
              action="lead"
              locale={locale}
              instance={challenge.instance}
              onToken={challenge.setToken}
              onError={() => {
                challenge.setToken('');
                setStatus('errorCaptcha');
              }}
            />
            <button
              type="submit"
              disabled={token === ''}
              className={`${PRIMARY_BUTTON} w-full sm:w-fit`}
            >
              {pending ? copy.sending : copy.submit}
            </button>
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
