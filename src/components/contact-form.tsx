import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useHydrated } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { type FormEvent, type ReactNode, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { PRIMARY_BUTTON, TEXT_LINK } from '@/components/ui';
import type { ContactInput } from '@/lib/contact-schema';
import { useLocale, useMessages } from '@/lib/i18n';
import { pagePath } from '@/lib/page-registry';
import { PUBLIC_EMAIL, SITE } from '@/lib/site';
import { sendContact } from '@/server/contact.functions';

const CONTROL =
  'w-full rounded-input border border-border bg-bg px-3.5 py-3 text-base';

type Status = 'idle' | 'pending' | 'sent' | 'errorSend' | 'errorCaptcha';

function Field({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function ContactForm() {
  const { contact } = useMessages();
  const { form: copy } = contact;
  const locale = useLocale();
  const hydrated = useHydrated();
  const send = useServerFn(sendContact);
  const turnstile = useRef<TurnstileInstance>(undefined);
  const [engaged, setEngaged] = useState(false);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const successHeading = useRef<HTMLParagraphElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const pending = status === 'pending';

  function fail(next: 'errorSend' | 'errorCaptcha') {
    flushSync(() => {
      setStatus(next);
      setToken('');
    });
    turnstile.current?.reset();
    alert.current?.focus();
  }

  function succeed() {
    flushSync(() => setStatus('sent'));
    successHeading.current?.focus();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input: ContactInput = {
      name: text(data, 'name'),
      email: text(data, 'email'),
      company: text(data, 'company') || undefined,
      message: text(data, 'message'),
      consent: true,
      turnstileToken: token,
      website: text(data, 'website'),
      locale,
    };
    setStatus('pending');
    try {
      const result = await send({ data: input });
      if (result.ok) succeed();
      else fail(result.error === 'captcha' ? 'errorCaptcha' : 'errorSend');
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
          onFocus={() => setEngaged(true)}
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
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  className={`${CONTROL} resize-y`}
                />
              )}
            </Field>
            <div aria-hidden="true" className="sr-only">
              <label>
                {copy.honeypot}
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  maxLength={200}
                />
              </label>
            </div>
            <label className="flex items-start gap-3 text-sm text-muted-fg">
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-1 size-4 shrink-0 accent-accent"
              />
              <span>
                {copy.consentBefore}
                <a href={pagePath(locale, 'privacy')} className={TEXT_LINK}>
                  {copy.consentLink}
                </a>
                {copy.consentAfter}
              </span>
            </label>
            {engaged ? (
              <Turnstile
                ref={turnstile}
                siteKey={SITE.turnstileSiteKey}
                options={{
                  action: 'contact',
                  theme: 'auto',
                  language: locale,
                  size: 'flexible',
                  refreshExpired: 'auto',
                }}
                onSuccess={setToken}
                onExpire={() => setToken('')}
                onError={() => {
                  setToken('');
                  setStatus('errorCaptcha');
                }}
              />
            ) : null}
            <button
              type="submit"
              disabled={token === ''}
              className={`${PRIMARY_BUTTON} w-full sm:w-fit`}
            >
              {pending ? copy.sending : copy.submit}
            </button>
            {status === 'errorSend' || status === 'errorCaptcha' ? (
              <p
                ref={alert}
                role="alert"
                tabIndex={-1}
                className="text-sm outline-hidden"
              >
                {copy[status]}{' '}
                <a href={`mailto:${PUBLIC_EMAIL}`} className={TEXT_LINK}>
                  {PUBLIC_EMAIL}
                </a>
                .
              </p>
            ) : null}
          </fieldset>
        </form>
      )}
    </div>
  );
}
