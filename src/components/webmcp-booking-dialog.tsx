import { type FormEvent, useCallback, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  BookingDetailsFields,
  BookingSuccess,
  ConsentCheckbox,
  FormAlert,
  Honeypot,
  LazyTurnstile,
} from '@/components/form-parts';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui';
import { useChallenge } from '@/components/use-challenge';
import { submitBooking } from '@/lib/booking-client';
import { type BookingFailureKind, failureOf } from '@/lib/booking-failure';
import { text } from '@/lib/form-data';
import { messages } from '@/lib/i18n';
import { attribution } from '@/lib/lead-client';
import { formatSlotLabel } from '@/lib/slot-format';
import { track } from '@/lib/track';
import {
  type BookingRequest,
  isEnvelope,
  type ToolEnvelope,
} from '@/lib/webmcp/confirmation';

type Status = 'idle' | 'pending' | BookingFailureKind;
type Confirmed = { when: string; email: string; meetUrl: string | null };

const UNAVAILABLE: ToolEnvelope = { ok: false, error: 'unavailable' };

export function WebMcpBookingDialog({ request }: { request: BookingRequest }) {
  const { proposal, locale, label, copy } = request;
  const { form } = messages[locale].contact;
  const challenge = useChallenge();
  const [status, setStatus] = useState<Status>('idle');
  const [answered, setAnswered] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);
  const element = useRef<HTMLDialogElement | null>(null);
  // Stable, so a re-render does not close and reopen the dialog. Cleanup also
  // runs when the confirmation is taken down, and restores the page's focus.
  const modal = useCallback((node: HTMLDialogElement | null) => {
    element.current = node;
    if (!node) return;
    const previous = document.activeElement;
    if (!node.open) node.showModal();
    return () => {
      if (node.open) node.close();
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus();
      }
    };
  }, []);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const introId = useId();
  const pending = status === 'pending';
  const failure = status === 'idle' || pending ? null : status;

  // Only the first Escape after an activation can be cancelled, so a second one
  // closes the dialog: while a booking is being sent it is put straight back.
  function onClose() {
    if (!request.isHeld()) {
      request.dismiss();
      return;
    }
    if (element.current?.open === false) element.current.showModal();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // A synthetic submit skips the browser's own required check.
    if (data.get('consent') !== 'on') return;
    if (!request.begin()) return;
    setStatus('pending');
    const result = await submitBooking({
      slot: proposal.slot,
      name: text(data, 'name'),
      email: text(data, 'email'),
      company: text(data, 'company') || undefined,
      topic: text(data, 'topic'),
      timeZone: proposal.timeZone,
      locale,
      consent: true,
      turnstileToken: challenge.token,
      website: text(data, 'website'),
      attribution: await attribution(),
    });
    const envelope = isEnvelope(result.envelope)
      ? result.envelope
      : UNAVAILABLE;
    if (result.kind === 'booked') {
      flushSync(() => {
        setConfirmed({
          when: formatSlotLabel(locale, result.start, proposal.timeZone),
          email: text(data, 'email'),
          meetUrl: result.meetUrl,
        });
        setStatus('idle');
        setAnswered(true);
      });
      successHeading.current?.focus();
      request.finish(envelope, true);
      track('book_meeting');
      track('generate_lead', { method: 'webmcp' });
      return;
    }
    const next = failureOf(result);
    if (next === 'captcha') {
      request.retry();
      challenge.retry();
    } else {
      setAnswered(true);
      request.finish(envelope, false);
    }
    flushSync(() => setStatus(next));
    alert.current?.focus();
  }

  return (
    <dialog
      ref={modal}
      onClose={onClose}
      onCancel={(event) => {
        if (request.isHeld()) event.preventDefault();
      }}
      aria-labelledby={titleId}
      aria-describedby={confirmed ? undefined : introId}
      data-webmcp-dialog
      className="fixed inset-0 m-auto h-fit max-h-[90dvh] w-[min(100%-2rem,32rem)] overflow-y-auto rounded-card border border-border bg-bg p-6 text-fg backdrop:bg-bg/60"
    >
      {confirmed ? (
        <div className="grid gap-4">
          <BookingSuccess
            headingRef={successHeading}
            headingId={titleId}
            headingClass="text-2xl"
            title={copy.success.title}
            when={confirmed.when}
            text={copy.success.text.replace('{email}', confirmed.email)}
            meetUrl={confirmed.meetUrl}
            meet={copy.success.meet}
            meetLater={copy.success.meetLater}
          />
          <button
            type="button"
            onClick={() => element.current?.close()}
            className={`${SECONDARY_BUTTON} w-full sm:w-fit`}
          >
            {copy.close}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-5">
          <h2 id={titleId} className="text-2xl">
            {copy.title}
          </h2>
          <p id={introId} className="text-sm text-muted-fg">
            {copy.intro}
          </p>
          <p className="text-sm">
            <span className="font-medium">{copy.when}: </span>
            {label} · {proposal.timeZone}
          </p>
          <fieldset disabled={pending || answered} className="grid gap-5">
            <BookingDetailsFields
              labels={{
                name: form.name,
                email: form.email,
                company: form.company,
                topic: form.message,
              }}
              defaults={proposal}
              topicRows={4}
            />
            <Honeypot label={form.honeypot} />
            <ConsentCheckbox
              locale={locale}
              template={form.consent}
              linkText={form.consentLink}
            />
            <LazyTurnstile
              engaged
              action="book"
              locale={locale}
              instance={challenge.instance}
              onToken={challenge.setToken}
              onError={() => {
                challenge.setToken('');
                setStatus('captcha');
              }}
            />
          </fieldset>
          {failure ? (
            <FormAlert alertRef={alert}>{copy.errors[failure]}</FormAlert>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {answered ? null : (
              <button
                type="submit"
                disabled={challenge.token === '' || pending}
                className={PRIMARY_BUTTON}
              >
                {pending ? copy.confirming : copy.confirm}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => element.current?.close()}
              className={SECONDARY_BUTTON}
            >
              {answered ? copy.close : copy.cancel}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
